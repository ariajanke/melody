import { Helpers } from '../helpers';
import { WasmHelpers } from './wasm_helpers';
import { type WasmFunctionBody } from './wasm_function_body';

const { freeze } = Helpers;

export const WasmCodeSection = (() => {
  const class_ = freeze({
    make(mCode: number[] = [],
         mFunctionCount = 0)
    {
      const { encodeVaruint32 } = WasmHelpers;
      return freeze({
        pushFunctionBody(functionBody: WasmFunctionBody) {
          mCode = [
            ...mCode,
            ...functionBody.finish()
          ];
          const rv = class_.make(mCode, mFunctionCount + 1);
          mCode = [];
          return rv;
        },
        finish() {
          const numOfFunc = encodeVaruint32(mFunctionCount);
          mCode = [...numOfFunc, ...mCode];

          const rv = [
            0x0A, // Code Section
            ...encodeVaruint32(mCode.length),
            ...mCode
          ];
          mCode = [];
          return rv;
        }
      });
    }
  });
  return class_;
})();
export type WasmCodeSection = ReturnType<typeof WasmCodeSection.make>;
