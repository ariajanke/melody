/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

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
