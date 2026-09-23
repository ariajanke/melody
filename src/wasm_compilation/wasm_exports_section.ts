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
