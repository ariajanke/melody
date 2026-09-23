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
import { CharacterClass } from './character_class';
import { type AdvancedTokenLoopState, type TokenLoopState } from './token_loop_state';

const { freeze } = Helpers;

export interface SourceReader {
  codePointAt(i: number): number | undefined;
  strategyFor(position: number): CrawlerStrategy;
};

export interface CrawlerStrategy {
  findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState;
};

function nextNonEscapedIdx(source: SourceReader, idx: number): number {
  const kEscape = CharacterClass.commonCharacterCodes().escape;
  const code = source.codePointAt(idx);
  if (code === kEscape && source.codePointAt(idx + 1) !== undefined) {
    return idx + 2;
  }
  return idx + 1;
}

export const CrawlerStrategy = freeze({ nextNonEscapedIdx });
