import { Helpers } from '../helpers';
import { FinisherHelpers, TypesAware, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;


function localCountIntoCode(count: number) {
  const { encodeVaruint32 } = WasmHelpers;
  const { asCode } = TypesAware;

  if (count === 0) {
    return [...encodeVaruint32(0)];
  }
  // treat everything as an i32
  return [
    ...encodeVaruint32(1),
    ...encodeVaruint32(count),
    asCode('i32')
  ];
}

const {
  i32Add,
  i32Subtract,
  i32Multiply,
  call,
  i32load,
  i32store,
  drop,
  indirectCall,
  functionEnd,
} = TypesAware.opCodes();

function make() {
  let mCode: number[] = [];
  let mLocalCount = 0, mStackCount = 0;
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

  function makeAttr
    (by: keyof ReturnType<typeof TypesAware.opCodes>)
  {
    const stackDelta = by.slice(0, 3) === 'set' ? -1 : 1;
    const scope = by.slice(3);
    const opCode = TypesAware.opCodes()[by];
    return (idx: number) => {
      verifyStackIncrement(stackDelta);
      if (idx < 0 || idx > 255) {
        throw new Error(`Invalid/Unsupported ${scope} index ${idx}`);
      }
      return pushCode(opCode, idx);
    };
  }

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
      return pushCode(i32Add);
    },
    pushI32Subtract: () => {
      verifyStackIncrement(-1);
      return pushCode(i32Subtract);
    },
    pushI32Multiply: () => {
      verifyStackIncrement(-1);
      return pushCode(i32Multiply);
    },
    pushI32Load    : () => {
      return pushCode(
        i32load,
        ...encodeVaruint32(Math.log2(4)), // alignmnet
        ...encodeVaruint32(0) // offset
      );
    },
    pushI32Store: () => {
      verifyStackIncrement(-2);
      return pushCode(i32store, 0x02, ...encodeVaruint32(0));
    },
    pushFunctionCall(funcIdx: number) {
      return pushCode(call, ...encodeVaruint32(funcIdx));
    },
    pushLocal() {
      mLocalCount += 1;
      resetFinishedCode();
      return inst;
    },
    localCount: () => mLocalCount,
    stackCount: () => mStackCount,
    pushDrop() {
      return pushCode(drop);
    },
    setLocal: makeAttr('setLocal'),
    getLocal: makeAttr('getLocal'),
    setGlobal: makeAttr('setGlobal'),
    getGlobal: makeAttr('getGlobal'),
    callIndirect(typeIdx: number) {
      verifyStackIncrement(-1);
      return pushCode(indirectCall, ...encodeVaruint32(typeIdx), 0);
    },
    finish() {
      return trackFinished(() => {
        // must begin with local decl count
        const localsInfo = localCountIntoCode(mLocalCount);
        const wrappedCode = [
          ...localsInfo,
          ...mCode,
          functionEnd
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

export const WasmFunctionBody = freeze({ make });
export type WasmFunctionBody = ReturnType<typeof WasmFunctionBody.make>;
