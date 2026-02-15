import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

const kSectionCode = 0x04;
const kFuncRefType = 0x70;

function make() {
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  const { encodeVaruint32 } = WasmHelpers;

  let mFunctionCount = 0;
  const inst = freeze({
    setFunctionCount(n: number) {
      resetFinishedCode();
      mFunctionCount = n;
      return inst;
    },
    finish: () => trackFinished(() => {
      const funcCount = encodeVaruint32(mFunctionCount);
      const code = [
        0x01, // 1 table
        kFuncRefType,
        0x00, // no limit
      ];
      return [
        kSectionCode,
        ...encodeVaruint32(funcCount.length + code.length),
        ...code,
        ...funcCount
      ];
    })
  });
  return inst;
}

export const WasmTableSection = freeze({ make });
export type WasmTableSection = ReturnType<typeof WasmTableSection.make>;
