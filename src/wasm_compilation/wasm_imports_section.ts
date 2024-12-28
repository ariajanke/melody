import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmImportsSection = freeze({
  make(mCode: number [] = [], mImportsCount: number = 0) {
    const { encodeVaruint32, convertStringToNumbers, externalKinds } = WasmHelpers;
    const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
    const inst = freeze({
      pushFunction(idx: number, moduleName: string, fieldName: string) {
        resetFinishedCode();
        (idx >= 0 && idx < 256) || (() => {
          throw new Error('index too beefy');
        })();
        mCode.push(
          ...encodeVaruint32(moduleName.length),
          ...convertStringToNumbers(moduleName),
          ...encodeVaruint32(fieldName.length),
          ...convertStringToNumbers(fieldName),
          externalKinds().func,
          ...encodeVaruint32(idx)
        );
        mImportsCount += 1;
        return inst;
      },
      functionCount: () => mImportsCount,
      finish() {
        return trackFinished(() => {
          const imptCount = encodeVaruint32(mImportsCount);
          return [
            2, // section code
            ...encodeVaruint32(mCode.length + imptCount.length),
            ...imptCount,
            ...mCode
          ];
        });
      }
    });
    return inst;
  }
});
export type WasmImportsSection = ReturnType<typeof WasmImportsSection.make>;
