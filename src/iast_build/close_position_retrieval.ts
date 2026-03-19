import { Helpers, StandardErrorFn } from '../helpers';
import { TokenRange } from '../token_range';
import { Token } from '../token';
import { StandardError } from '../helpers';

const { freeze, memoize } = Helpers;

export interface ClosePositionRetrieval {
  closePosition: () => number | undefined,
  error: StandardErrorFn
}

export const ClosePositionRetrieval = freeze({
  make: (mTokenRange: TokenRange, mGroupOpen: Token): ClosePositionRetrieval => {
    const { error, setErrorMessage } = StandardError.make();
    const { tokenAt, start, end } = mTokenRange;

    const fromUntil = (idx: number, end: number): number | undefined => {
      let openings = 1;
      for (; idx < end; ++idx) {
        const tok = tokenAt(idx).content();
        if (tok === '(') {
          ++openings;
        } else if (tok === ')') {
          --openings;
          if (openings < 1)
            { return idx; }
        }
      }
      return undefined;
    };

    return freeze({
      closePosition: memoize(() =>
        fromUntil(start(), end()) ??
          setErrorMessage(
            `Cannot find close position for ${mGroupOpen.content()}`)),
      error
    });
  }
});
