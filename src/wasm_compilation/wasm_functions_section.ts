import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmFunctionsSection = (() => {
  const class_ = freeze({
    make(mCode: number[] = [], mNumberOfFunctions = 0) {
      const { encodeVaruint32 } = WasmHelpers;
      const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
      const inst = freeze({
        pushSignatureFrom(n: number) {
          resetFinishedCode();
          mCode.push( ...encodeVaruint32(n) );
          mNumberOfFunctions += 1;
          return inst;
        },
        finish() {
          return trackFinished(() => {
            const funcCount = encodeVaruint32(mNumberOfFunctions);
            return [
              0x03,
              ...encodeVaruint32(mCode.length + funcCount.length),
              ...funcCount,
              ...mCode
            ];
          });
        }
      });
      return inst;
    }
  });
  return class_;
})();
export type WasmFunctionsSection = ReturnType<typeof WasmFunctionsSection.make>;
