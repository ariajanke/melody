import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';
import { type WasmFunctionBody } from './wasm_function_body';

const { freeze } = Helpers;

export const WasmCodeSection = (() => {
  const class_ = freeze({
    make(mCode: number[] = [],
         mFunctionCount = 0)
    {
      const { encodeVaruint32 } = WasmHelpers;
      const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
      const inst = freeze({
        pushFunctionBody(functionBody: WasmFunctionBody) {
          resetFinishedCode();
          mCode.push(...functionBody.finish());
          mFunctionCount += 1;
          return inst;
        },
        finish(): Readonly<number[]> {
          return trackFinished(() => {
            const numOfFunc = encodeVaruint32(mFunctionCount);
            return [
              0x0A, // Code Section
              ...encodeVaruint32(mCode.length + numOfFunc.length),
              ...numOfFunc,
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
export type WasmCodeSection = ReturnType<typeof WasmCodeSection.make>;
