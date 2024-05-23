import { TokenCollection } from './tokenization';
import { Token } from './token';
import { Helpers } from './helpers';

const { freeze } = Helpers;

export interface TokenRange {
  step: () => TokenRange,
  skipNewLine: () => TokenRange,
  clone: () => TokenRange,
  tokenAt: (i: number) => Token,
  start: () => number,
  end: () => number,
  parentContainerSize: () => number
}

export const TokenRange = (() => {
  function makeStartingRange(mTokens: TokenCollection) {
    return make(mTokens, 0, mTokens.count());
  }

  function make
    (mTokens: TokenCollection, mStart: number, mEnd: number):
    TokenRange
  {
    if (mStart > mEnd) {
      throw Error(`Range start ${mStart} must be less than or equal to end ${mEnd}`);
    } else if (mTokens.count() < mEnd) {
      throw Error(`Range end ${mEnd} cannot exceed token count ${mTokens.count()}`);
    }

    const parentContainerSize = mTokens.count;
    const tokenAt = mTokens.at;
    const inst = freeze({
      step, skipNewLine, clone, tokenAt, start, end, parentContainerSize
    });

    function step() {
      ++mStart;
      return inst;
    }

    function skipNewLine() {
      mStart = mTokens.skipNewLine(mStart);
      return inst;
    }

    function clone()
      { return make(mTokens, mStart, mEnd); }

    function start() { return mStart; }

    function end() { return mEnd; }

    return inst;
  }

  return freeze({ make, makeStartingRange });
})();
