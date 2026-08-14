import { Helpers, raise } from '../helpers';
import { Token, TokenType } from '../token';
import { CharacterClass } from './character_class';
import { NumericCrawler } from './numeric_crawler';
import {
  CrawlerStrategy,
  SourceReader,
} from './crawler_strategy';
import { AdvancedTokenLoopState, TokenLoopState } from './token_loop_state';
import { GroupingNamingSchema } from '../grouping_naming_schema';

const { freeze, memoize } = Helpers;
const { commonCharacterCodes, isWhitespace, isNumeric, isAlphabetic } =
  CharacterClass;

const identifierLiteralCrawler = memoize((): CrawlerStrategy => {
  const kDollar = commonCharacterCodes().dollar;
  const kSingleQuote = commonCharacterCodes().singleQuote;
  const { identifier } = Token.types;

  function findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
    const start = state.position();
    if (source.codePointAt(start) !== kDollar)
      { raise('crawler assumes start at dollar symbol'); }

    if (source.codePointAt(start + 1) === undefined)
      { return state.advanceTo(start + 1); }

    for (let i = start + 1; ; ++i) {
      const code = source.codePointAt(i);

      const isTerminus =
        code === undefined || isWhitespace(code) || code === kSingleQuote;
      if (!isTerminus)
        { continue; }
      
      return state.
        pushToken(start + 1, i, identifier).
        advanceTo(i);
    }
  }

  return freeze({ findNext });
});

const operatorCrawler = memoize((): CrawlerStrategy => {
  const kColon = commonCharacterCodes().colon;
  const kEq = commonCharacterCodes().equality;
  const { operator } = Token.types;

  function findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
    const start = state.position();
    const isAsgn =
      source.codePointAt(start) === kColon &&
      source.codePointAt(start + 1) === kEq;
    const offset = isAsgn ? 2 : 1;
    const nextPos = start + offset;
    return state.
      pushToken(start, nextPos, operator).
      advanceTo(nextPos);
  }

  return freeze({ findNext });
});

const groupingCodeIntoType = (() => {
  type CodeMap = { [code: number]: TokenType | undefined };
  const intoCodes = (arr: Readonly<string[]>): Readonly<number[]> =>
    arr.filter(s => s.length === 1).map(s => s.codePointAt(0) as number);
  const intoMaps = (arr: Readonly<string[]>, type: TokenType): CodeMap[] =>
    intoCodes(arr).map((code: number) => ({ [code]: type }));
  
  const map: CodeMap = Object.assign({},
    ...intoMaps(GroupingNamingSchema.kAllClosings, Token.types.grouping.closing),
    ...intoMaps(GroupingNamingSchema.kAllOpenings, Token.types.grouping.opening));
  return (code: number): TokenType =>
    map[code] ?? raise('not a valid grouping');
})();

const groupingCrawler = memoize((): CrawlerStrategy => freeze({
  findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
    const start = state.position();
    const code = source.codePointAt(start) ??
                 raise('must start on a character');
    return state.
      pushToken(start, start + 1, groupingCodeIntoType(code)).
      advanceTo(start + 1);
  }
}));

const escapeCrawler = memoize((): CrawlerStrategy => {
  const kEscapeTokenType = Token.types.operator;
  return freeze({
    findNext(_0: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
      const pos = state.position();
      return state.pushToken(pos, pos + 1, kEscapeTokenType).advanceTo(pos + 1);
    }
  });
});

const alphaNumericCrawler = memoize((): CrawlerStrategy => {
  function findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
    const start = state.position();
    const code = source.codePointAt(start);
    if (!isAlphabetic(code))
      { raise('numeric assumption broken'); }

    for (let i = start + 1; ; ++i) {
      const code = source.codePointAt(i);

      if (isNumeric(code) || isAlphabetic(code))
        { continue; }

      return state.pushAlphaNumeric(start, i).advanceTo(i);
    }
  }

  return freeze({ findNext });
});

const whitespaceStrategy = memoize((): CrawlerStrategy => freeze({
  findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
    for (let i = state.position(); ; ++i) {
      const code = source.codePointAt(i);
      if (!isWhitespace(code))
        { return state.advanceTo(i); }
    }
  }
}));

const negationStrategy = memoize((): CrawlerStrategy => freeze({
  findNext(source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState {
    const nextCode = source.codePointAt(state.position() + 1);
    if (isNumeric(nextCode))
      { return NumericCrawler.instance().findNext(source, state); }

    return operatorCrawler().findNext(source, state);
  }
}));

export const SimpleCrawlers = freeze({
  operatorCrawler,
  alphaNumericCrawler,
  whitespaceStrategy,
  negationStrategy,
  groupingCrawler,
  identifierLiteralCrawler,
  escapeCrawler
});
