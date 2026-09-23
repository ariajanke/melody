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
