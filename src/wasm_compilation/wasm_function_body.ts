import { Helpers } from '../helpers';
import { FinisherHelpers, TypesAware, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmFunctionBody = (() => {
  const kOpCodes = freeze({
    getLocal    : 0x20,
    setLocal    : 0x21,
    i32Add      : 0x6A,
    i32Subtract : 0x6B,
    i32Multiply : 0x6C,
    i32Const    : 0x41,
    call        : 0x10,
    i32load     : 0x28,
    i32store    : 0x36,
    drop        : 0x1A,
    indirectCall: 0x11
  });
  const kFunctionEnd = 0x0B;

  function localCountIntoCode(count: number) {
    const { encodeVaruint32 } = WasmHelpers;
    const { wasmTypes, asCode } = TypesAware;

    if (count === 0) {
      return [...encodeVaruint32(0)];
    }
    // treat everything as an i32
    return [
      ...encodeVaruint32(1),
      ...encodeVaruint32(count),
      asCode(wasmTypes().i32)
    ];
  }
  
  const class_ = freeze({
    make(mCode: number[] = [], mLocalCount = 0, mStackCount = 0) {
      const { encodeVaruint32 } = WasmHelpers;
      const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
      function verifyStackIncrement(amount: number) {
        mStackCount += amount;
        if (mStackCount < 0) {
          throw new Error('Trying to use an empty stack');
        }
      }

      const pushCode = (...code: number[]) => {
        resetFinishedCode();
        mCode.push(...code);
        return inst;
      };
      const inst = freeze({
        prependCode(extraCode: number[]) {
          mCode = [...extraCode, ...mCode];
          return inst;
        },
        prependCodeTo(wfb: WasmFunctionBody) {
          wfb.prependCode(mCode);
          return inst;
        },
        pushI32Const(constant: number) {
          verifyStackIncrement(1);
          if (constant < 0 || constant > 2000000000) {
            throw new Error(`Value ${constant} not supported for i32 const`);
          }
          return pushCode(0x41, ...encodeVaruint32(constant));
        },
        pushI32Add: () => {
          verifyStackIncrement(-1);
          return pushCode(kOpCodes.i32Add);
        },
        pushI32Subtract: () => {
          verifyStackIncrement(-1);
          return pushCode(kOpCodes.i32Subtract);
        },
        pushI32Multiply: () => {
          verifyStackIncrement(-1);
          return pushCode(kOpCodes.i32Multiply);
        },
        pushI32Load    : () => {
          return pushCode(
            kOpCodes.i32load,
            ...encodeVaruint32(Math.log2(4)), // alignmnet
            ...encodeVaruint32(0) // offset
          );
        },
        pushI32Store: () => {
          verifyStackIncrement(-2);
          return pushCode(kOpCodes.i32store, 0x02, ...encodeVaruint32(0));
        },
        pushFunctionCall(funcIdx: number) {
          return pushCode(kOpCodes.call, ...encodeVaruint32(funcIdx));
        },
        pushLocal() {
          mLocalCount += 1;
          resetFinishedCode();
          return inst;
        },
        localCount: () => mLocalCount,
        stackCount: () => mStackCount,
        pushDrop() {
          return pushCode(kOpCodes.drop);
        },
        setLocal(idx: number) {
          verifyStackIncrement(-1);
          if (idx < 0 || idx > 255) {
            throw new Error(`Invalid/Unsupported local index ${idx}`);
          }
          return pushCode(kOpCodes.setLocal, idx);
        },
        getLocal(idx: number) {
          verifyStackIncrement(1);
          if (idx < 0 || idx > 255) {
            throw new Error(`Invalid/Unsupported local index ${idx}`);
          }
          return pushCode(kOpCodes.getLocal, idx);
        },
        callIndirect(typeIdx: number) {
          verifyStackIncrement(-1);
          return pushCode(kOpCodes.indirectCall, ...encodeVaruint32(typeIdx), 0);
        },
        finish() {
          return trackFinished(() => {
            // must begin with local decl count
            const localsInfo = localCountIntoCode(mLocalCount);
            const wrappedCode = [
              ...localsInfo,
              ...mCode,
              kFunctionEnd
            ];
            
            return [
              ...encodeVaruint32(wrappedCode.length),
              ...wrappedCode
            ];
          });
        }
      });
      return inst;
    }
  });
  return class_;
})();
export type WasmFunctionBody = ReturnType<typeof WasmFunctionBody.make>;
