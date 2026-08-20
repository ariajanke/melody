import { Helpers, raise } from './helpers';
import { Token } from './token';
import { TokenRange } from './token_range';
import { CrawlStrategies } from './tokenization/crawl_strategies';
import { CrawlerStrategy, SourceReader } from './tokenization/crawler_strategy';
import { TokenLoopState } from './tokenization/token_loop_state';

const { memoize, freeze } = Helpers;

export interface Tokenization {
  tokens(): Readonly<Token[]>;
  tokenRange(): TokenRange;
};

function make(mSourceCode: string): Tokenization {
  const mState = TokenLoopState.make(mSourceCode);

  const mSource: SourceReader = freeze({
    codePointAt(i: number): number | undefined {
      const { length } = mSourceCode;
      if (i > length + 1)
        { raise(`Index too far out of bound (${i}, for length ${length}`); }

      return mSourceCode.codePointAt(i);
    },
    strategyFor(position: number): CrawlerStrategy
      { return CrawlStrategies.for_(mSource, position); }
  });
  
  const tokens = memoize((): Readonly<Token[]> => {
    while (true) {
      const position = mState.position();
      const crawler = mState.
        topStrategyPatch().
        strategyFor(mSource, position) ??
        mSource.strategyFor(position);
      const nextState = crawler.findNext(mSource, mState);
      if (nextState.position() <= position)
        { raise('must advance position!'); }

      if (mSource.codePointAt(nextState.position()) !== undefined)
        { continue; }

      // TODO
      // concept of a Tokens finisher service, whereby calls (and possible
      // escapes) come into play, thereby creating a complete picture for TPB
      // services
      return mState.tokens();
    }
  });

  const tokenRange = memoize((): TokenRange =>
    TokenRange.makeStartingRange(tokens().slice()));

  return freeze({ tokens, tokenRange });
}

export const Tokenization = freeze({ make });
