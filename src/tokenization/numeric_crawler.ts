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
import { Token } from '../token';
import { CharacterClass } from './character_class';
import {
  CrawlerStrategy,
  SourceReader,
} from './crawler_strategy';
import { AdvancedTokenLoopState, TokenLoopState } from './token_loop_state';

const { freeze, memoize } = Helpers;

function make(): CrawlerStrategy {
  const { commonCharacterCodes, isNumeric } = CharacterClass;
  const kNeg = commonCharacterCodes().negative;
  const kDot = commonCharacterCodes().dot;
  const kNumericLiteral = Token.types.literal.numeric;

  function advanceWithToken
    (state: TokenLoopState, start: number, idx: number): AdvancedTokenLoopState
  {
    return state.
      pushToken(start, idx, kNumericLiteral).advanceTo(idx);
  }

  function findNext(source: SourceReader, state: TokenLoopState)
    : AdvancedTokenLoopState
  {
    const start = state.position();
    let idx = start;
    let dotFound = false;

    if (source.codePointAt(start) === kNeg)
      { ++idx; }

    if (!isNumeric(source.codePointAt(idx)))
      { raise('numeric assumption broken'); }

    for (; ; ++idx) {
      const code = source.codePointAt(idx);
      if (code === kDot) {
        if (dotFound)
          { return advanceWithToken(state, start, idx); }

        const nextCode = source.codePointAt(idx + 1);
        if (isNumeric(nextCode)) {
          dotFound = true;
          continue;
        }

        return advanceWithToken(state, start, idx);
      }

      if (!isNumeric(code))
        { return advanceWithToken(state, start, idx); }
    }
  }
  return freeze({ findNext });
}

export const NumericCrawler = freeze({ instance: memoize(make) });
