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
      if (idx < 0 && idx >= 256)
        { raise('index too beefy'); }
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
