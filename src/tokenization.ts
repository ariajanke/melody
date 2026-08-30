import { Helpers, raise } from './helpers';
import { Token } from './token';
import { CrawlStrategies } from './tokenization/crawl_strategies';
import { CrawlerStrategy, SourceReader } from './tokenization/crawler_strategy';
import { TokenFinisher } from './tokenization/token_finisher';
import { TokenLoopState } from './tokenization/token_loop_state';

const { memoize, freeze } = Helpers;

export interface Tokenization {
  tokens(): Readonly<Token[]>;
};

type TokenFinisherConstructor = typeof TokenFinisher.make;

function make
  (mSourceCode: string,
   mTokenFinisherConstructor: TokenFinisherConstructor = TokenFinisher.make)
  : Tokenization
{
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

      return mTokenFinisherConstructor(mState.tokens()).finishedTokens();
    }
  });

  return freeze({ tokens });
}

export const Tokenization = freeze({ make });
