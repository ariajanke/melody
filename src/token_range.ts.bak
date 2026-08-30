import { Token } from './token';
import { Helpers, raise } from './helpers';

const { freeze, verifyInTesting } = Helpers;

export interface TokenRange {
  step: () => TokenRange,
  skipNewLine: () => TokenRange,
  clone: (start?: number, end?: number) => TokenRange,
  tokenAt: (i: number) => Token,
  start: () => number,
  end: () => number,
  isEmpty: () => boolean,
  startToken: () => Token,
  range: () => Readonly<{ start: number, end: number }>,
  asString: () => string
}

function makeStartingRange(mTokens: Token[]): TokenRange {
  return make(mTokens, 0, mTokens.length);
}

function forEachIn(tokenRange: TokenRange, fn: (token: string) => void): void {
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
  const kNewLineType = Token.types.newLine;
  const inst = freeze({
    step: () => {
      ++mStart;
      return _verifyValidRange();
    },
    skipNewLine: () => {
      if (inst.isEmpty() || mTokens[mStart].type() !== kNewLineType) {
        return inst;
      }
      return inst.step();
    },
    clone: (start?: number, end?: number) =>
      make(mTokens, start ?? mStart, end ?? mEnd),
    tokenAt   : (i: number) => mTokens[i],
    start     : () => mStart,
    end       : () => mEnd,
    isEmpty   : () => mStart === mEnd,
    startToken: () => mTokens[mStart],
    range     : () => {
      verifyInTesting();
      return freeze({ start: mStart, end: mEnd });
    },
    asString: () => {
      let s = '';
      for (let i = mStart; i < mEnd; ++i) {
        s = `${s}, ${mTokens[i].content().replace('\n', '\\n')}`;
      }
      return s;
    }
  });

  function _verifyValidRange(): TokenRange {
    const { length } = mTokens;
    if (mStart > mEnd) {
      raise(`Range start ${mStart} must be less than or equal to end ${mEnd}`);
    } else if (length < mEnd) {
      raise(`Range end ${mEnd} cannot exceed token count ${length}`);
    }
    return inst;
  }

  return _verifyValidRange();
}

export const TokenRange = freeze({ make, makeStartingRange, forEachIn });
