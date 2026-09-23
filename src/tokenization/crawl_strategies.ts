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
import { CharacterClass, CharacterClassName } from './character_class';
import {
  CrawlerStrategy,
  SourceReader,
} from './crawler_strategy';
import { HashCrawler } from './hash_crawler';
import { NewLineCrawler } from './new_line_crawler';
import { NumericCrawler } from './numeric_crawler';
import { SimpleCrawlers } from './simple_crawlers';
import { StringLiteralStrategy } from './string_literal_crawler';

const { freeze, memoize } = Helpers;

type CharacterClassToStrategyMap = Readonly<{
  [cc in CharacterClassName]: () => CrawlerStrategy
}>;

const characterClassToStrategyMap = memoize((): CharacterClassToStrategyMap => freeze({
  numeric: NumericCrawler.instance,
  alphabetic: SimpleCrawlers.alphaNumericCrawler,
  negative: SimpleCrawlers.negationStrategy,
  operative: SimpleCrawlers.operatorCrawler,
  whitespace: SimpleCrawlers.whitespaceStrategy,
  newLine: NewLineCrawler.instance,
  grouping: SimpleCrawlers.groupingCrawler,
  stringLiteral: memoize(StringLiteralStrategy.make),
  hash: HashCrawler.instance,
  identifierLiteral: SimpleCrawlers.identifierLiteralCrawler,
  escape: SimpleCrawlers.escapeCrawler
}));

function for_(parent: SourceReader, idx: number): CrawlerStrategy {
  const code = parent.codePointAt(idx);
  const class_ = CharacterClass.classOfCharacter(code) ??
    raise(`unexpected unclassifiable character`);
  return characterClassToStrategyMap()[class_]();
}

export const CrawlStrategies = freeze({ for_ });
