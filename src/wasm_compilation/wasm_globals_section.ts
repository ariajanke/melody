import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { SymFunc, TypesAware, WasmHelpers } from './wasm_helpers';

const { encodeVaruint32 } = WasmHelpers;
const { freeze } = Helpers;
const { asCode, wasmTypes } = TypesAware;

function construct(mCode: number[] = [], mNumberOfGlobals = 0) {
  function pushGlobal(mutable: number, type: SymFunc, initialValue: number) {
    const fbody = WasmFunctionBody.make().pushI32Const(initialValue);
    mCode.push(asCode(type), mutable, ...fbody.finish());
    return inst;
  }
  const inst = freeze({
    pushWritableGlobal: (type: SymFunc, initialValue: number) =>
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

export const WasmGlobalsSection = freeze({
  wasmTypes,
  make: () => construct()
});
export type WasmGlobalsSection = ReturnType<typeof construct>;
