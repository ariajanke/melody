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

import { Helpers, raise } from '../../helpers';

const { freeze } = Helpers;

export interface LetMarkings {
  isOutsideOfLetStatement(): boolean;
};

export interface LetMarkingsStack extends LetMarkings {
  markInsideLetStatement(): void;
  markOutsideLetStatement(): void;
  popMarking(): void;
  assertEmpty(why: string): void;
};

function make(): LetMarkingsStack {
  const mInsideLet: (boolean | undefined)[] = [];
  return freeze({
    markInsideLetStatement(): void
      { mInsideLet.push(true); },
    markOutsideLetStatement(): void
      { mInsideLet.push(false); },
    popMarking(): void
      { mInsideLet.pop(); },
    isOutsideOfLetStatement(): boolean
      { return mInsideLet[mInsideLet.length - 1] !== true; },
    assertEmpty(why: string): void {
      if (mInsideLet.length === 0)
        { return; }

      raise(why);
    }
  });
}

export const LetMarkingStack = freeze({ make });
