import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { CharacterClass } from './character_class';
import {
  CrawlerStrategy,
  SourceReader,
} from './crawler_strategy';
import { StringCrawlListener } from './string_crawl_listener';
import {
  AdvancedTokenLoopState,
  StrategyPatch,
  TokenLoopState
} from './token_loop_state';

const { freeze, memoize } = Helpers;

function make(): CrawlerStrategy {
  const { nextNonEscapedIdx } = CrawlerStrategy;
  const { commonCharacterCodes } = CharacterClass;
  const { makeInitialEntry, makeReentry } = StringCrawlListener;

  const kCurlClose = commonCharacterCodes().curlClose;
  const kSingleQuote = commonCharacterCodes().singleQuote;
  const kHash = commonCharacterCodes().hash;
  const kCurlOpen = commonCharacterCodes().curlOpen;

  const kConcatenation = Token.types.concatenation;
  const kStringLiteral = Token.types.stringLiteral;

  const reentry = memoize((): CrawlerStrategy => freeze({
    findNext: makeFindNextFunction(makeReentry(strategyPatch))
  }));

  const strategyPatch = memoize((): StrategyPatch => freeze({
    strategyFor(
      source: SourceReader, position: number): CrawlerStrategy | undefined
    {
      if (source.codePointAt(position) === kCurlClose)
        { return reentry(); }

      return undefined;
    },
    uid: memoize(Symbol)
  }));

  function makeFindNextFunction(intf: StringCrawlListener): CrawlerStrategy['findNext'] {
    return (source: SourceReader, state: TokenLoopState): AdvancedTokenLoopState =>
    {
      const startingCharacter = source.codePointAt(state.position());
      if (startingCharacter !== intf.assumedStartingCharacter())
        { raise('assumptions'); }

      const start = state.position() + 1;
      state = intf.onEntry(state, start);
      
      for (let idx = start; ; idx = nextNonEscapedIdx(source, idx)) {
        const code = source.codePointAt(idx);
        if (code === undefined) {
          return state.
            pushToken(start, idx, kStringLiteral).
            advanceTo(idx);
        }

        const nextCode = source.codePointAt(idx + 1);
        if (code === kHash && nextCode === kCurlOpen) {
          return intf.
            onExit(state).
            pushToken(start, idx, kStringLiteral).
            pushToken(idx, idx + 2, kConcatenation).
            advanceTo(idx + 2);
        }

        if (code === kSingleQuote) {
          return intf.
            onClose(state).
            pushToken(start, idx, kStringLiteral).
            advanceTo(idx + 1);
        }
      }
    };
  }

  return freeze({
    findNext: makeFindNextFunction(makeInitialEntry(strategyPatch))
  });
}

export const StringLiteralStrategy = freeze({ make });
