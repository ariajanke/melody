import { TokenCollection } from './tokenization';
import { Token } from './token';
import { Helpers } from './helpers';

const { freeze } = Helpers;

export interface TokenRange {
  step: () => TokenRange,
  skipNewLine: () => TokenRange,
  clone: (start?: number, end?: number) => TokenRange,
  tokenAt: (i: number) => Token,
  start: () => number,
  end: () => number,
  parentContainerSize: () => number,
  // set: (start: number, end: number) => TokenRange
}

export const TokenRange = (() => {
  function zeroSizedRange(range: TokenRange): boolean
    { return range.start() === range.end(); }

  function makeStartingRange(mTokens: TokenCollection) {
    return make(mTokens, 0, mTokens.count());
  }

  function make
    (mTokens: TokenCollection, mStart: number, mEnd: number):
    TokenRange
  {

    const parentContainerSize = mTokens.count;
    const tokenAt = mTokens.at;
    const inst = freeze({
      step,
      skipNewLine,
      clone,
      tokenAt,
      start,
      end,
      parentContainerSize, 
      // set
    });

    function verifyValidRange() {
      if (mStart > mEnd) {
        throw Error(`Range start ${mStart} must be less than or equal to end ${mEnd}`);
      } else if (mTokens.count() < mEnd) {
        throw Error(`Range end ${mEnd} cannot exceed token count ${mTokens.count()}`);
      }
    }

    function step() {
      ++mStart;
      return inst;
    }

    function skipNewLine() {
      mStart = mTokens.skipNewLine(mStart);
      return inst;
    }

    function clone(start?: number, end?: number)
      { return make(mTokens, start ?? mStart, end ?? mEnd); }

    // function set(start: number, end: number) {
    //   mStart = start;
    //   mEnd = end;
    //   verifyValidRange();
    //   return inst;
    // }

    function start() { return mStart; }

    function end() { return mEnd; }

    verifyValidRange();
    return inst;
  }

  return freeze({ make, makeStartingRange, zeroSizedRange });
})();
