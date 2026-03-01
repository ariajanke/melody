import { Helpers, raise } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;
const kImportsSectionId = 0x02;

function make() {
  const mCode: number [] = [];
  let mImportsCount: number = 0;
  const { encodeVaruint32, convertStringToNumbers, externalKinds } =
    WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  function pushImportName(moduleName: string, fieldName: string) {
    return mCode.push(
      ...encodeVaruint32(moduleName.length),
      ...convertStringToNumbers(moduleName),
      ...encodeVaruint32(fieldName.length),
      ...convertStringToNumbers(fieldName)
    );
  }
  const inst = freeze({
    pushFunction(idx: number, moduleName: string, fieldName: string) {
      resetFinishedCode();
      (idx >= 0 && idx < 256) || raise('index too beefy');
      pushImportName(moduleName, fieldName);
      mCode.push(
        externalKinds().func,
        ...encodeVaruint32(idx)
      );
      mImportsCount += 1;
      return inst;
    },
    pushMemory(moduleName: string, fieldName: string) {
      resetFinishedCode();
      const kNoMaximum = 0;
      const flags = kNoMaximum;
      const min = 1;
      pushImportName(moduleName, fieldName);
      mCode.push(
        externalKinds().memory,
        ...encodeVaruint32(flags),
        ...encodeVaruint32(min)
      );
      mImportsCount += 1;
      return inst;
    },
    functionCount: () => mImportsCount,
    finish() {
      return trackFinished(() => {
        const imptCount = encodeVaruint32(mImportsCount);
        return [
          kImportsSectionId,
          ...encodeVaruint32(mCode.length + imptCount.length),
          ...imptCount,
          ...mCode
        ];
      });
    }
  });
  return inst;
}

export const WasmImportsSection = freeze({ make });
export type WasmImportsSection = ReturnType<typeof WasmImportsSection.make>;
