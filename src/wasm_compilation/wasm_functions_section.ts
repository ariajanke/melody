import { Helpers } from '../helpers';
import { WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmFunctionsSection = (() => {
  const class_ = freeze({
    make(mCode: number[] = [], mNumberOfFunctions = 0) {
      const { encodeVaruint32 } = WasmHelpers;
      return freeze({
        pushSignatureFrom(n: number) {
          mCode.push( ...encodeVaruint32(n) );
          const rv = class_.make(mCode, mNumberOfFunctions + 1);
          mCode = [];
          return rv;
        },
        finish() {
          mCode = [...encodeVaruint32(mNumberOfFunctions), ...mCode];
          const rv = [
            0x03,
            ...encodeVaruint32(mCode.length),
            ...mCode
          ];
          mCode.length = 0;
          return rv;
        }
      });
    }
  });
  return class_;
})();
export type WasmFunctionsSection = ReturnType<typeof WasmFunctionsSection.make>;
