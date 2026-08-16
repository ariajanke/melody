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
