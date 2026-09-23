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
const kNewLineType = Token.types.grouping.separator;

function make(): CrawlerStrategy {
  const kNlCode = CharacterClass.commonCharacterCodes().newLine;

  const firstNonNl = (source: SourceReader, idx: number): number | undefined => {
    const code = source.codePointAt(idx);
    if (code === undefined)
      { return code; }

    if (code !== kNlCode)
      { return idx; }
  
    return firstNonNl(source, idx + 1);
  };

  const findNext =
    (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState =>
  {
    const { position } = state;
    if (source.codePointAt(position()) !== kNlCode)
      { raise('assumptions broken'); }

    const pos = firstNonNl(source, position());
    if (!pos)
      { return state.advanceTo(position() + 1); }

    return state.pushToken(pos - 1, pos, kNewLineType).advanceTo(pos);
  };

  return freeze({ findNext });
}

export const NewLineCrawler = freeze({ instance: memoize(make) });
