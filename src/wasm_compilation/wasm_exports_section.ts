import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmExportsSection = (() => {
  const class_ = freeze({
    make(mCode: number[] = [], mNumberOfExports = 0) {
      const { encodeVaruint32, convertStringToNumbers, externalKinds } = WasmHelpers;
      const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
      const inst = freeze({
        pushFunction(name: string, functionIdx: number) {
          resetFinishedCode();
          mCode = [
            ...mCode,
            ...encodeVaruint32(name.length),
            ...convertStringToNumbers(name),
            externalKinds().func,
            ...encodeVaruint32(functionIdx)
          ];
          mNumberOfExports += 1;
          return inst;
        },
        finish() {
          return trackFinished(() => {
            const exportsCount = encodeVaruint32(mNumberOfExports);
            return [
              0x07,
              ...encodeVaruint32(mCode.length + exportsCount.length),
              ...exportsCount,
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
export type WasmExportsSection = ReturnType<typeof WasmExportsSection.make>;
