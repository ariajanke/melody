import { Helpers, raise } from '../helpers';
import { FinisherHelpers, TypesAware, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

const kCodeSectionId = 0x0A;

export interface WasmCodeSection {
  pushFunctionBody(bytecode: Readonly<number[]>): this;
  finish(): Readonly<number[]>
};

function make(): WasmCodeSection {
  const mCode: number[] = [];
  let mFunctionCount = 0;
  const { encodeVaruint32 } = WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  const inst = freeze({
    pushFunctionBody(bytecode: Readonly<number[]>): WasmCodeSection {
      if (TypesAware.opCodes().functionEnd !==
          bytecode[bytecode.length - 1])
      {
        raise('bytecode must describe a function body ');
      }
      resetFinishedCode();
      mCode.push(...bytecode);
      mFunctionCount += 1;
      return inst;
    },
    finish(): Readonly<number[]> {
      return trackFinished(() => {
        const numOfFunc = encodeVaruint32(mFunctionCount);
        return [
          kCodeSectionId,
          ...encodeVaruint32(mCode.length + numOfFunc.length),
          ...numOfFunc,
          ...mCode
        ];
      });
    }
  });
  return inst;
}

export const WasmCodeSection = freeze({ make });
