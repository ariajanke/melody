import { Helpers } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';

const { freeze, memoize } = Helpers;

const class_ = freeze({
  closePositionOf: (mTokenRange: TokenRange, mGroupOpen: Token): number =>
    class_.make(mTokenRange, mGroupOpen).closePosition(),
  make: (mTokenRange: TokenRange, mGroupOpen: Token) => {
    if (mGroupOpen.content() !== 'fn') {
      throw new Error(`Cannot use "${mGroupOpen.content()}" to open function body`);
    }

    const { start, end, tokenAt } = mTokenRange;
    const preNewLineNonFn = () => {
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
    const fallbackClosePosition = () => {
      const beg = newLineAt();
      if (!beg)
        { return undefined; }
      for (let i = beg; i < end(); ++i) {
        if (tokenAt(i).content() === '~')
          return i;
      }
      return undefined;
    };
    const knownClosePosition = () =>
      preNewLineNonFn() ? newLineAt() : fallbackClosePosition();
    return freeze({
      closePosition: memoize(() => knownClosePosition() ?? end())
    });
  }
});

export const FnClosePositionRetrieval = class_;
export type  FnClosePositionRetrieval = ReturnType<typeof class_.make>;
