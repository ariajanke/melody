import { Helpers, raise } from '../helpers';
import { FinisherHelpers, TypesAware, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

function localCountIntoCode(count: number): number[] {
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
  i32Const
} = TypesAware.opCodes();

export interface WasmFunctionBody {
  prependCode(extraCode: number[]): WasmFunctionBody;
  prependCodeTo(wfb: WasmFunctionBody): WasmFunctionBody;
  pushI32Const(constant: number): WasmFunctionBody;
  pushI32Add(): WasmFunctionBody;
  pushI32Subtract(): WasmFunctionBody;
  pushI32Multiply(): WasmFunctionBody;
  pushI32Load(): WasmFunctionBody;
  pushI32Store(): WasmFunctionBody;
  pushFunctionCall(funcIdx: number): WasmFunctionBody;
  pushLocal(): WasmFunctionBody;
  localCount(): number;
  stackCount(): number;
  pushDrop(): WasmFunctionBody;
  setLocal(idx: number): WasmFunctionBody;
  getLocal(idx: number): WasmFunctionBody;
  setGlobal(idx: number): WasmFunctionBody;
  getGlobal(idx: number): WasmFunctionBody;
  callIndirect(typeIdx: number): WasmFunctionBody;
  pushTeeLocal(idx: number): WasmFunctionBody;
  finish(): Readonly<number[]>;
};

function make(): WasmFunctionBody {
  let mCode: number[] = [];
  let mLocalCount = 0, mStackCount = 0;
  const { encodeVaruint32, encodeVarsint32 } = WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  function verifyStackIncrement(amount: number): void {
    mStackCount += amount;
    if (mStackCount < 0) {
      raise('Trying to use an empty stack');
    }
  }

  const pushCode = (...code: number[]): WasmFunctionBody => {
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
        raise(`Invalid/Unsupported ${scope} index ${idx}`);
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
      return pushCode(i32Const, ...encodeVarsint32(constant));
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
    pushTeeLocal: makeAttr('teeLocal'),
    finish() {
      return trackFinished(() => {
        // NOTE by WASM spec, must begin with local decl count
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
