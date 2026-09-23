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
import { Token, TokenType } from '../token';
import { type CrawlerStrategy, type SourceReader } from './crawler_strategy';

export interface StrategyPatch {
  strategyFor(source: SourceReader, position: number)
    : CrawlerStrategy | undefined;
  uid(): symbol;
};

export interface TokenLoopState {
  position(): number;
  advanceTo(position: number): AdvancedTokenLoopState;
  pushToken(beg: number, end: number, type: TokenType): TokenLoopState;
  pushAlphaNumeric(beg: number, end: number): TokenLoopState;
  pushStrategyPatch(patch: StrategyPatch): TokenLoopState;
  popStrategyPatch(patch: StrategyPatch): TokenLoopState;
};

export interface AdvancedTokenLoopState extends TokenLoopState {
  topStrategyPatch(): StrategyPatch;
  tokens(): Readonly<Token[]>;
};

const { freeze, memoize } = Helpers;

function make(mSourceCode: string): AdvancedTokenLoopState {
  const mPatches: StrategyPatch[] = [];
  let mPosition = 0;
  const mTokens: Token[] = [];
  const kDefaultPatch: StrategyPatch = freeze({
    strategyFor(_0: SourceReader, _1: number): CrawlerStrategy | undefined
      { return undefined; },
    uid: memoize(Symbol)
  });
  function pushToken_(tok: Token): TokenLoopState {
    mTokens.push(tok);
    return mState;
  }
  const mState: AdvancedTokenLoopState = freeze({
    position: () => mPosition,
    advanceTo(position: number): AdvancedTokenLoopState {
      if (position <= mPosition)
        { raise('position must be strictly increasing'); }

      mPosition = position;
      return mState;
    },
    pushToken(beg: number, end: number, type: TokenType): TokenLoopState {
      return pushToken_(Token.make( mSourceCode, beg, end, type ));
    },
    pushAlphaNumeric(beg: number, end: number): TokenLoopState {
      const tok = Token.makeAlphaNumeric(mSourceCode, beg, end);
      return pushToken_(tok);
    },
    pushStrategyPatch(patch: StrategyPatch): TokenLoopState {
      mPatches.push(patch);
      return mState;
    },
    popStrategyPatch(patch: StrategyPatch): TokenLoopState {
      const topPatch: StrategyPatch | undefined =
        mPatches[mPatches.length - 1];
      if (topPatch?.uid() !== patch.uid()) {
        raise('cannot pop, mismatching uids');
      }

      mPatches.pop();
      return mState;
    },
    topStrategyPatch(): StrategyPatch {
      const topPatch: StrategyPatch | undefined =
        mPatches[mPatches.length - 1];
      return topPatch ?? kDefaultPatch;
    },
    tokens: (): Readonly<Token[]> => mTokens
  });

  return mState;
}

export const TokenLoopState = freeze({ make });
