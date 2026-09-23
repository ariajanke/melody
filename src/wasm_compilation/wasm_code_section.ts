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
