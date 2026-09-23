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

const kSectionCode = 0x04;
const kFuncRefType = 0x70;

export interface WasmTableSection {
  setFunctionCount(n: number): this;
  finish(): Readonly<number[]>;
};

function make(): WasmTableSection {
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
