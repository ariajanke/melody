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
  const { nextNonEscapedIdx } = CrawlerStrategy;
  const { commonCharacterCodes, isNumeric, isAlphabetic } = CharacterClass;
  const kEndCurlCode = commonCharacterCodes().curlClose;
  const kHash = commonCharacterCodes().hash;
  const kOpenCurl = commonCharacterCodes().curlOpen;
  const kNlCode = commonCharacterCodes().newLine;
  const kHashLiteral = Token.types.literal.hash;

  function handleEmbedComment
    (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState
  {
    const start = state.position();
    for (let idx = start; ; idx = nextNonEscapedIdx(source, idx)) {
      const nextCode = source.codePointAt(idx);
      if (nextCode === kEndCurlCode)
        { return state.advanceTo(idx + 1); }

      if (nextCode === undefined)
        { return state.advanceTo(idx); }
    }
  }

  function handleHashLiteral
    (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState
  {
    const start = state.position();
    for (let idx = start; ; ++idx) {
      const code = source.codePointAt(idx);
      if (isNumeric(code) || isAlphabetic(code))
        { continue; }

      return state.pushToken(start, idx, kHashLiteral).advanceTo(idx);
    }
  }

  function handleLineComment
    (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState
  {
    for (let idx = state.position(); ; ++idx) {
      const code = source.codePointAt(idx);
      if (code !== kNlCode && code !== undefined)
        { continue; }

      return state.advanceTo(idx);
    }
  }

  function getAdvancementFn
    (nextCode: number): (source: SourceReader, state: TokenLoopState) => AdvancedTokenLoopState
  {
    if (nextCode === kOpenCurl)
      { return handleEmbedComment; }

    if (isNumeric(nextCode))
      { return handleHashLiteral; }

    return handleLineComment;
  }

  const findNext = (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState => {
    if (source.codePointAt(state.position()) !== kHash)
      { raise('assumptions'); }

    const start = state.position() + 1;
    const nextCode = source.codePointAt(start);
    if (nextCode === undefined)
      { return state.advanceTo(start); }

    const advance = getAdvancementFn(nextCode);
    return advance(source, state.advanceTo(start));
  };

  return freeze({ findNext });
}

export const HashCrawler = freeze({ instance: memoize(make) });
