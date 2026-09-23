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

const { freeze, memoize } = Helpers;

const kMemorySectionId = 0x05;
const kPagesofMemory = 16;

export interface WasmMemorySection {
  finish(): Readonly<number[]>;
}

function construct(): WasmMemorySection {
  const { encodeVaruint32 } = WasmHelpers;
  const { trackFinished } = FinisherHelpers.make();

  const inst = freeze({
    finish() {
      return trackFinished(() => {
        return [
          kMemorySectionId,
          3  , // section size
          1  , // count of memory descriptions
          0x0, // no flags -> no maximum
          ...encodeVaruint32(kPagesofMemory)
        ];
      });
    }
  });
  return inst;
}

export const WasmMemorySection = freeze({ instance: memoize(construct) });
