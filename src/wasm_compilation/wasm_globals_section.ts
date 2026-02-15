// RETAIN
// rationale: globals maybe a thing at some point, but I need to understand

import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { TypesAware, WasmHelpers, WasmType } from './wasm_helpers';

const { encodeVaruint32 } = WasmHelpers;
const { freeze } = Helpers;
const { asCode } = TypesAware;

function construct() {
  const mCode: number[] = [];
  const mNumberOfGlobals = 0;
  function pushGlobal(mutable: number, type: WasmType, initialValue: number) {
    const fbody = WasmFunctionBody.make().pushI32Const(initialValue);
    mCode.push(asCode(type), mutable, ...fbody.finish());
    return inst;
  }
  const inst = freeze({
    pushWritableGlobal: (type: WasmType, initialValue: number) =>
      pushGlobal(1, type, initialValue),
    finish() {
      const numGlobs = encodeVaruint32(mNumberOfGlobals);
      return [
        0x06,
        ...encodeVaruint32(numGlobs.length + mCode.length),
        ...numGlobs,
        ...mCode
      ];
    }
  });
  return inst;
}

export const WasmGlobalsSection = freeze({ make: construct });
export type WasmGlobalsSection = ReturnType<typeof construct>;
