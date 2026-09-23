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

import { Helpers } from '../src/helpers';

const { freeze } = Helpers;

export const TestHelpers = freeze({
  describeNamed,
  fdescribeNamed
});

function describeNamed(obj: object, descFn: () => void): void {
  describe(Object.keys(obj)[0], descFn);
}

function fdescribeNamed(obj: object, descFn: () => void): void {
  fdescribe(Object.keys(obj)[0], descFn);
}

export interface ReachPoint {
  hitsAtExactly: (times: number) => void,
  verifyHit: () => boolean
};

export interface ReachPointCollection {
  points: () => Readonly<ReachPoint[]>,
  verifyAllHit: () => boolean
}

export const ReachPoint = (()
  : Readonly<{ make: () => ReachPoint, makeCollection: (size: number) => ReachPointCollection }> =>
{
  function make(): ReachPoint {
    return construct([0], 0);
  }

  function construct(mSet: number[], mIdx: number): ReachPoint {
    let mRequiredHits = 1;
    let mName = `Point ${mIdx + 1}`;

    return Object.freeze({
      hitsAtExactly: (times: number, name?: string) => {
        mRequiredHits = times;
        mSet[mIdx]++;
        if (mSet[mIdx] > times) {
          throw Error(`Reached "${mName} too many times`);
        }
        if (name) {
          mName = name;
        }
      },
      verifyHit: () => {
        if (mSet[mIdx] !== mRequiredHits) {
          throw Error(`Point "${mName}" was not reached ${mRequiredHits} times`);
        }
        return true;
      }
    });
  }

  function makeCollection(size: number): ReachPointCollection {
    const mSet: number[] = [];
    mSet.length = size;
    mSet.fill(0);
    const mPoints: ReachPoint[] = [];
    for (let i = 0; i < size; ++i) {
      mPoints.push(construct(mSet, i));
    }

    return Object.freeze({
      points: (): Readonly<ReachPoint[]> => mPoints,
      verifyAllHit: (): boolean => {
        mPoints.forEach((pt) => { pt.verifyHit(); });
        return true;
      }
    });
  }

  return Object.freeze({ make, makeCollection });
})();

export const CallbackLocationMark = freeze({
  make() {
    let mMark: string | undefined = undefined;
    return freeze({
      mark: () => mMark,
      markOnEntry(newMark: string, fn: () => void) {
        const oldMark = mMark;
        mMark = newMark;
        fn();
        mMark = oldMark;
      }
    });
  }
});
