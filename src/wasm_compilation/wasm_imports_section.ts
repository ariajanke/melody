import { Helpers } from '../helpers';
import { WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmImportsSection = freeze({
  make(mCode: number [] = [], mImportsCount: number = 0) {
    const { encodeVaruint32, convertStringToNumbers, externalKinds } = WasmHelpers;
    return freeze({
      pushFunction(idx: number, moduleName: string, fieldName: string) {
        (idx >= 0 && idx < 256) || (() => {
          throw new Error('index too beefy');
        })();
        return WasmImportsSection.
          make(
            [
              ...mCode,
              ...encodeVaruint32(moduleName.length),
              ...convertStringToNumbers(moduleName),
              ...encodeVaruint32(fieldName.length),
              ...convertStringToNumbers(fieldName),
              externalKinds().func,
              ...encodeVaruint32(idx)
            ],
            mImportsCount + 1);
      },
      functionCount: () => mImportsCount,
      finish() {
        const imptCount = encodeVaruint32(mImportsCount);
        const rv = [
          2, // section code
          ...encodeVaruint32(mCode.length + imptCount.length),
          ...imptCount,
          ...mCode
        ];
        mCode.length = 0;
        mImportsCount = 0;
        return rv;
      }
    });
  }
});
export type WasmImportsSection = ReturnType<typeof WasmImportsSection.make>;
