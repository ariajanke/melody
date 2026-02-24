import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;
const kFunctionsSectionId = 0x03;

export interface WasmFunctionsSection {
  pushSignatureFrom(n: number): this;
  finish(): Readonly<number[]>;
};

function make(): WasmFunctionsSection {
  const mCode: number[] = [];
  let mNumberOfFunctions = 0;
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
          kFunctionsSectionId,
          ...encodeVaruint32(mCode.length + funcCount.length),
          ...funcCount,
          ...mCode
        ];
      });
    }
  });
  return inst;
}

export const WasmFunctionsSection = freeze({ make });
