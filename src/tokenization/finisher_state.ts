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
import { Token } from '../token';

const { freeze } = Helpers;

export interface FinisherState {
  advanceBy(n: number): FinisherState;
  replaceLeft(tok: Token | undefined): FinisherState;
  replaceRight(tok: Token | undefined): FinisherState;
  pushCallEmissionAfter(): FinisherState;
};

export interface FinisherStateWithData extends FinisherState {
  index(): number;
  tokens(): (Token | undefined)[];
  callEmissions(): number[];
};

export const FinisherState = freeze({
  make(mTokens: (Token | undefined)[]): FinisherStateWithData {
    let mIdx = 0;
    const mCallEmissionsAfter: number[] = [];
    const inst: FinisherStateWithData = freeze({
      advanceBy(n: number): FinisherState {
        mIdx += n;
        return inst;
      },
      replaceLeft(tok: Token | undefined): FinisherState {
        mTokens[mIdx] = tok;
        return inst;
      },
      replaceRight(tok: Token | undefined): FinisherState {
        mTokens[mIdx + 1] = tok;
        return inst;
      },
      pushCallEmissionAfter(): FinisherState {
        mCallEmissionsAfter.push(mIdx);
        return inst;
      },
      index: () => mIdx,
      tokens: () => mTokens,
      callEmissions: () => mCallEmissionsAfter
    });
    return inst;
  }
});
