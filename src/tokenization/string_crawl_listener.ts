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
import { CharacterClass } from './character_class';
import {
  StrategyPatch,
  TokenLoopState
} from './token_loop_state';

const { freeze } = Helpers;

export interface StringCrawlListener {
  assumedStartingCharacter(): number;
  onEntry(state: TokenLoopState, start: number): TokenLoopState;
  onExit (state: TokenLoopState): TokenLoopState;
  onClose(state: TokenLoopState): TokenLoopState;
};

export const StringCrawlListener = freeze({
  makeInitialEntry(patchExit: () => StrategyPatch): StringCrawlListener {
    const kSingleQuote = CharacterClass.commonCharacterCodes().singleQuote;
    return freeze({
      assumedStartingCharacter: () => kSingleQuote,
      onEntry(state: TokenLoopState, _1: number): TokenLoopState
        { return state; },
      onExit(state: TokenLoopState): TokenLoopState
        { return state.pushStrategyPatch(patchExit()); },
      onClose(state: TokenLoopState): TokenLoopState
        { return state; }
    });
  },
  makeReentry(popClose: () => StrategyPatch): StringCrawlListener {
    const kConcatenation = Token.types.concatenation;
    const kCurlClose = CharacterClass.commonCharacterCodes().curlClose;
    return freeze({
      assumedStartingCharacter: () => kCurlClose,
      onEntry(state: TokenLoopState, start: number): TokenLoopState
        { return state.pushToken(state.position(), start, kConcatenation); },
      onExit(state: TokenLoopState): TokenLoopState
        { return state; },
      onClose(state: TokenLoopState): TokenLoopState
        { return state.popStrategyPatch(popClose()); }
    });
  }
});
