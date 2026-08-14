import { Helpers, raise } from '../helpers';
import { Token, TokenType } from '../token';
import { type CrawlerStrategy, type SourceReader } from './crawler_strategy';

export interface StrategyPatch {
  strategyFor(source: SourceReader, position: number)
    : CrawlerStrategy | undefined;
  uid(): symbol;
};

export interface TokenLoopState {
  position(): number;
  advanceTo(position: number): AdvancedTokenLoopState;
  pushToken(beg: number, end: number, type: TokenType): TokenLoopState;
  pushAlphaNumeric(beg: number, end: number): TokenLoopState;
  pushStrategyPatch(patch: StrategyPatch): TokenLoopState;
  popStrategyPatch(patch: StrategyPatch): TokenLoopState;
};

export interface AdvancedTokenLoopState extends TokenLoopState {
  topStrategyPatch(): StrategyPatch;
  tokens(): Readonly<Token[]>;
};

const { freeze, memoize } = Helpers;

function make(mSourceCode: string): AdvancedTokenLoopState {
  const mPatches: StrategyPatch[] = [];
  let mPosition = 0;
  const mTokens: Token[] = [];
  const kDefaultPatch: StrategyPatch = freeze({
    strategyFor(_0: SourceReader, _1: number): CrawlerStrategy | undefined
      { return undefined; },
    uid: memoize(Symbol)
  });
  function pushToken_(tok: Token): TokenLoopState {
    mTokens.push(tok);
    return mState;
  }
  const mState: AdvancedTokenLoopState = freeze({
    position: () => mPosition,
    advanceTo(position: number): AdvancedTokenLoopState {
      if (position <= mPosition)
        { raise('position must be strictly increasing'); }

      mPosition = position;
      return mState;
    },
    pushToken(beg: number, end: number, type: TokenType): TokenLoopState {
      return pushToken_(Token.make( mSourceCode, beg, end, type ));
    },
    pushAlphaNumeric(beg: number, end: number): TokenLoopState {
      const tok = Token.makeAlphaNumeric(mSourceCode, beg, end);
      return pushToken_(tok);
    },
    pushStrategyPatch(patch: StrategyPatch): TokenLoopState {
      mPatches.push(patch);
      return mState;
    },
    popStrategyPatch(patch: StrategyPatch): TokenLoopState {
      const topPatch: StrategyPatch | undefined =
        mPatches[mPatches.length - 1];
      if (topPatch?.uid() !== patch.uid()) {
        raise('cannot pop, mismatching uids');
      }

      mPatches.pop();
      return mState;
    },
    topStrategyPatch(): StrategyPatch {
      const topPatch: StrategyPatch | undefined =
        mPatches[mPatches.length - 1];
      return topPatch ?? kDefaultPatch;
    },
    tokens: (): Readonly<Token[]> => mTokens
  });

  return mState;
}

export const TokenLoopState = freeze({ make });
