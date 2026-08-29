import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';

const { freeze, memoize } = Helpers;

function closePositionOf(mTokenRange: TokenRange, mGroupOpen: Token): number
  { return make(mTokenRange, mGroupOpen).closePosition(); }

export interface FnClosePositionRetrieval {
  closePosition: () => number;
};

function make(mTokenRange: TokenRange, mGroupOpen: Token): FnClosePositionRetrieval {
  if (mGroupOpen.content() !== 'fn') {
    raise(`Cannot use "${mGroupOpen.content()}" to open function body`);
  }

  const { start, end, tokenAt } = mTokenRange;
  const preNewLineNonFn = (): number | undefined => {
    const end_ = newLineAt() ?? end();
    for (let i = start(); i < end_; ++i) {
      if (tokenAt(i).content() !== 'fn') {
        return i;
      }
    }
    return undefined;
  };
  const newLineAt = memoize(() => {
    for (let i = start(); i < end(); ++i) {
      if (tokenAt(i).type() === Token.types.newLine) {
        return i;
      }
    }
    return undefined;
  });
  const fallbackClosePosition = (): number | undefined => {
    const beg = newLineAt();
    if (!beg)
      { return undefined; }
    let depth = 0;
    for (let i = beg; i < end(); ++i) {
      const content = tokenAt(i).content();
      if (content === 'fn')
        { ++depth; }
      else if (content === '~') {
        if (depth === 0)
          { return i; }
        --depth;
      }
    }
    return undefined;
  };
  const knownClosePosition = (): number | undefined =>
    preNewLineNonFn() ? newLineAt() : fallbackClosePosition();
  return freeze({
    closePosition: memoize(() => knownClosePosition() ?? end())
  });
}

export const FnClosePositionRetrieval = freeze({
  make, closePositionOf
});
