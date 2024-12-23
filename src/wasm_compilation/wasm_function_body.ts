import { Helpers } from '../helpers';
import { TypesAware, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmFunctionBody = (() => {
  const kOpCodes = freeze({
    getLocal   : 0x20,
    setLocal   : 0x21,
    i32Add     : 0x6A,
    i32Subtract: 0x6B,
    i32Multiply: 0x6C,
    i32Const   : 0x41,
    call       : 0x10,
    i32load    : 0x28,
    i32store   : 0x36,
    drop       : 0x1A
  });
  const kFunctionEnd = 0x0B;

  function localCountIntoCode(count: number) {
    const { encodeVaruint32 } = WasmHelpers;
    const { wasmTypes, asCode } = TypesAware;

    if (count === 0) {
      return [...encodeVaruint32(0)];
    }
    return [
      ...encodeVaruint32(count),
      ...encodeVaruint32(count),
      asCode(wasmTypes().i32)
    ];
  }
  
  const class_ = freeze({
    make(mCode: number[] = [], mLocalCount = 0) {
      const { encodeVaruint32 } = WasmHelpers;

      const pushSingleInstruction = (instr: number) => {
        mCode = [
          ...mCode,
          instr
        ];
        return inst;
      };
      const inst = freeze({
        pushI32Const(constant: number) {
          if (constant < 0 || constant > 2000000000) {
            throw new Error(`Value ${constant} not supported for i32 const`);
          }
          mCode = [
            ...mCode,
            0x41,
            ...encodeVaruint32(constant)
          ];
          return inst;
        },
        pushI32Add: () => pushSingleInstruction(kOpCodes.i32Add),
        pushI32Subtract: () => pushSingleInstruction(kOpCodes.i32Subtract),
        pushI32Multiply: () => pushSingleInstruction(kOpCodes.i32Multiply),
        pushI32Load    : () => {
          mCode = [
            ...mCode,
            kOpCodes.i32load,
            0x02,
            ...encodeVaruint32(0)
          ];
          return inst;
        },
        pushI32Store: () => {
          mCode = [
            ...mCode,
            kOpCodes.i32store,
            0x02,
            ...encodeVaruint32(0)
          ];
          return inst;
        },
        pushFunctionCall(funcIdx: number) {
          mCode = [
            ...mCode,
            kOpCodes.call,
            ...encodeVaruint32(funcIdx)
          ];
          return inst;
        },
        pushLocal() {
          mLocalCount += 1;
          return inst;
        },
        localCount: () => mLocalCount,
        pushDrop() {
          mCode.push(kOpCodes.drop);
          return inst;
        },
        setLocal(idx: number) {
          mCode.push(kOpCodes.setLocal);
          mCode.push(idx);
          return inst;
        },
        getLocal(idx: number) {
          mCode.push(kOpCodes.getLocal);
          mCode.push(idx);
          return inst;
        },
        finish() {
          mCode.push(kFunctionEnd);
          // must begin with local decl count
          mCode = [...localCountIntoCode(mLocalCount), ...mCode];
          mCode = [
            ...encodeVaruint32(mCode.length),
            ...mCode
          ];
          const rv = mCode;
          return rv;
        }
      });
      return inst;
    }
  });
  return class_;
})();
export type WasmFunctionBody = ReturnType<typeof WasmFunctionBody.make>;
