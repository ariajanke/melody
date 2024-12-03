import { Helpers } from '../helpers';
import { WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmExportsSection = (() => {
  const class_ = freeze({
    make(mCode: number[] = [], mNumberOfExports = 0) {
      const { encodeVaruint32, convertStringToNumbers, externalKinds } = WasmHelpers;
      return freeze({
        pushFunction(name: string, functionIdx: number) {
          const newCode = [
            ...mCode,
            ...encodeVaruint32(name.length),
            ...convertStringToNumbers(name),
            externalKinds().func,
            ...encodeVaruint32(functionIdx)
          ];
          const rv = class_.make(newCode, mNumberOfExports + 1);
          mCode = [];
          return rv;
        },
        finish() {
          const exportsCount = encodeVaruint32(mNumberOfExports);
          const rv = [
            0x07,
            ...encodeVaruint32(mCode.length + exportsCount.length),
            ...exportsCount,
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
export type WasmExportsSection = ReturnType<typeof WasmExportsSection.make>;
