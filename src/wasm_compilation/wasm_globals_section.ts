// RETAIN
// rationale: globals maybe a thing at some point, but I need to understand

import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { FinisherHelpers, TypesAware, WasmHelpers, WasmType } from './wasm_helpers';

const { encodeVaruint32 } = WasmHelpers;
const { freeze, memoize } = Helpers;
const { asCode } = TypesAware;

const kMutable = 1,
      kImmutable = 0,
      kGlobalSectionId = 0x06,
      kStackPointerLocation = 0;

function construct() {
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  const mCode: number[] = [];
  const mNumberOfGlobals = 0;
  function pushGlobal(mutable: boolean, type: WasmType, initialValue: number) {
    resetFinishedCode();
    const fbody = WasmFunctionBody.make().pushI32Const(initialValue);
    const mutableCode = mutable ? kMutable : kImmutable;
    mCode.push(asCode(type), mutableCode, ...fbody.finish());
    return inst;
  }
  function pushStackPointer() {
    return pushGlobal(true, TypesAware.types().i32, 0);
  }
  
  const inst = freeze({
    finish: () =>
      trackFinished(() => {
        pushStackPointer();
        const numGlobs = encodeVaruint32(mNumberOfGlobals);
        return [
          kGlobalSectionId,
          ...encodeVaruint32(numGlobs.length + mCode.length),
          ...numGlobs,
          ...mCode
        ];
      })
  });
  return inst;
}

export const WasmGlobalsSection = freeze({
  instance: memoize(construct),
  kStackPointerLocation
});
export type WasmGlobalsSection = ReturnType<typeof construct>;
