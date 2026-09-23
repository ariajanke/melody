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
import { TypesAware, WasmHelpers } from './wasm_helpers';

const { encodeVaruint32 } = WasmHelpers;
const { freeze, memoize } = Helpers;
const { asCode } = TypesAware;

const kMutable = 1,
      kImmutable = 0,
      kGlobalSectionId = 0x06,
      kStackPointerLocation = 0;

// RETAIN for documentation
void kImmutable;

const { i32Const, functionEnd } = TypesAware.opCodes();

export interface WasmGlobalsSection {
  finish(): Readonly<number[]>;
};

function construct(): WasmGlobalsSection {
  const mCode: number[] = [];
  let mNumberOfGlobals = 0;

  function pushStackPointer(): void {
    // NOTE calls for varsint32 encoding, but 0 -> [0]
    const kInitialStackPointerValue = 0;
    const fcode = [i32Const, kInitialStackPointerValue, functionEnd];
    
    mCode.push(asCode(TypesAware.types().i32), kMutable, ...fcode);
    ++mNumberOfGlobals;
  }
  
  const inst = freeze({
    finish: memoize(() => {
      pushStackPointer();
      const numGlobals = encodeVaruint32(mNumberOfGlobals);
      return [
        kGlobalSectionId,
        ...encodeVaruint32(numGlobals.length + mCode.length),
        ...numGlobals,
        ...mCode
      ];
    })
  });
  return inst;
}

export const WasmGlobalsSection = freeze({
  instance: memoize(construct),
  kStackPointerLocation
});
