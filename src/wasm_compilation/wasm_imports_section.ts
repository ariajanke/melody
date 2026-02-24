import { Helpers, raise } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;
const kImportsSectionId = 0x02;

export interface WasmImportsSection {
  pushFunction(idx: number, moduleName: string, fieldName: string): this;
  pushMemory(moduleName: string, fieldName: string): this;
  functionCount(): number;
  finish(): Readonly<number[]>;
};

function make(): WasmImportsSection {
  const mCode: number [] = [];
  let mImportFunctionCount: number = 0;
  let mImportsCount: number = 0;
  const { encodeVaruint32, convertStringToNumbers, externalKinds } =
    WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  function pushImportName(moduleName: string, fieldName: string): number {
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
      mImportFunctionCount += 1;
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
    functionCount: () => mImportFunctionCount,
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
