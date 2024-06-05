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
  parentContainerSize: () => number
}

export const TokenRange = (() => {
  function zeroSizedRange(range: TokenRange): boolean
    { return range.start() === range.end(); }

  function makeStartingRange(mTokens: Token[]) {
    return make(mTokens, 0, mTokens.length);
  }

  function forEachIn(tokenRange, fn: (token: string) => void) {
    const { start, end } = tokenRange;
    const rangeEnd = end();
    for (let i = start(); i < rangeEnd; ++i) {
      fn(tokenRange.tokenAt(i).content());
    }
  }

  function make
    (mTokens: Token[], mStart: number, mEnd: number):
    TokenRange
  {
    const inst = freeze({
      step: () => {
        ++mStart;
        return _verifyValidRange();
      },
      skipNewLine: () => {
        if (inst.tokenAt(mStart).type() === Token.types.newLine) {
          ++mStart;
        }
        return inst;
      },
      clone: (start?: number, end?: number) =>
        make(mTokens, start ?? mStart, end ?? mEnd),
      tokenAt: (i: number) => mTokens[i],
      start: () => mStart,
      end: () => mEnd,
      parentContainerSize: () => mTokens.length
    });

    function _verifyValidRange() {
      const { length } = mTokens;
      if (mStart > mEnd) {
        throw Error(`Range start ${mStart} must be less than or equal to end ${mEnd}`);
      } else if (length < mEnd) {
        throw Error(`Range end ${mEnd} cannot exceed token count ${length}`);
      }
      return inst;
    }

    return _verifyValidRange();
  }

  return freeze({ make, makeStartingRange, zeroSizedRange, forEachIn });
})();
