import { Helpers, raise } from '../helpers';
import { FinisherHelpers, TypesAware, WasmHelpers } from './wasm_helpers';
import { WasmImportsSection } from './wasm_imports_section';

const { freeze, memoize } = Helpers;
const kElementSectionId = 0x09;
const elementSectionStarterBlurb = memoize(() =>
  [TypesAware.opCodes().i32Const, 0x00, TypesAware.opCodes().functionEnd]);

const preface = memoize((): readonly number[] =>
  [
    0x01, // number of segments
    0x00, // flags
    ...elementSectionStarterBlurb()
  ]);

export interface WasmElementsSection {
  setFunctionCount(n: number): WasmElementsSection;
  setStartingIndexFrom(importsSection: WasmImportsSection): WasmElementsSection;
  finish(): Readonly<number[]>;
};

function make(): WasmElementsSection {
  const { encodeVaruint32 } = WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
  let mFunctionCount = 0;
  let mStartingIndex: number | undefined = undefined;

  function setFunctionCount(n: number): WasmElementsSection {
    resetFinishedCode();
    mFunctionCount = n;
    return inst;
  }

  function setStartingIndexFrom(importsSection: WasmImportsSection): WasmElementsSection {
    resetFinishedCode();
    mStartingIndex = importsSection.functionCount();
    return inst;
  }

  const finish = (): Readonly<number[]> => trackFinished(() => {
    if (mStartingIndex === undefined) {
      raise('Starting index not set for elements section');
    }
    const mIndexList = Array.
      from({ length: mFunctionCount }, (_, i) => i + mStartingIndex!);
    const code = [
      ...preface(),
      ...encodeVaruint32(mFunctionCount),
      ...mIndexList
    ];
    
    return [
      kElementSectionId,
      ...encodeVaruint32(code.length),
      ...code,
    ];
  });

  const inst = freeze({ setFunctionCount, finish, setStartingIndexFrom });
  return inst;
}

export const WasmElementsSection = freeze({ make });
