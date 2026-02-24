import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

const kExportsSectionId = 0x07;

export interface WasmExportsSection {
  pushFunction(name: string, functionIdx: number): WasmExportsSection;
  finish(): Readonly<number[]>;
};

function make(): WasmExportsSection {
  const mCode: number[] = [];
  let mNumberOfExports = 0;
  const { encodeVaruint32, convertStringToNumbers, externalKinds } = WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  const inst = freeze({
    pushFunction(name: string, functionIdx: number): WasmExportsSection {
      resetFinishedCode();
      mCode.push(
        ...encodeVaruint32(name.length),
        ...convertStringToNumbers(name),
        externalKinds().func,
        ...encodeVaruint32(functionIdx)
      );
      mNumberOfExports += 1;
      return inst;
    },
    finish(): Readonly<number[]> {
      return trackFinished(() => {
        const exportsCount = encodeVaruint32(mNumberOfExports);
        return [
          kExportsSectionId,
          ...encodeVaruint32(mCode.length + exportsCount.length),
          ...exportsCount,
          ...mCode
        ];
      });
    }
  });
  return inst;
}

export const WasmExportsSection = freeze({ make });
