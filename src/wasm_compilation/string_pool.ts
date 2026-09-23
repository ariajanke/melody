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

import { CodeWriter } from '../code_writer';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

export interface StringLiteralWriter {
  pushLiteralString(str: string): CodeWriter;
};

export interface StringPool {
  mapToString(n: number): string | undefined;
  makeLiteralWriter(getInst: () => CodeWriter): StringLiteralWriter;
}

function make(): StringPool {
  const mStrings: string[] = [];
  const mStringMap: { [s: string]: number | undefined } = {};

  function internString(str: string): number {
    if (!mStringMap[str]) {
      mStringMap[str] = mStrings.length;
      mStrings.push(str);
    }

    return mStringMap[str];
  }

  const mapToString = (n: number): string => mStrings[n];

  function makeLiteralWriter(getInst: () => CodeWriter): StringLiteralWriter {
    return freeze({
      pushLiteralString: (str: string): CodeWriter =>
        getInst().pushInteger(internString(str))
    });
  }

  return freeze({ mapToString, makeLiteralWriter });
}

export const StringPool = freeze({ make });
