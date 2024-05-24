import { Helpers, StandardError, StandardErrorFn } from '../helpers';
import { TreePartBuild, LineContinuationScheme } from '../tree_part_build';
import { TokenRange } from '../token_range';

export interface PartialTreeNextTokenBuild {
  unprocessedPart: () => TreePartBuild | undefined,
  remainingRange: () => TokenRange,
  error: StandardErrorFn
}

export const PartialTreeNextTokenBuild = (() => {
  const { memoize, freeze } = Helpers;

  const kCloseMapping = freeze({
    ['(']: ')'
  });

  function make(mTokenRange: TokenRange, mFindCloseBasedOn: string) {
    const { error, setErrorMessage } = StandardError.make();
    const { start, end, parentContainerSize, tokenAt } = mTokenRange;
    const closeMapping: string | undefined = kCloseMapping[mFindCloseBasedOn];
    const lineCont = closeMapping ?
      LineContinuationScheme.inGroup :
      LineContinuationScheme.operatorContinued;

    const closePosition = memoize(() => {
      if (!closeMapping) {
        // not necessary try to find the new line
        return end();
      }

      const count = parentContainerSize();
      for (let i = start(); i < count; ++i) {
        if (tokenAt(i).content() === closeMapping) {
          // reminder: i is one past the last element for our range
          return i;
        }
      }

      return setErrorMessage(`Cannot find close position for ${mFindCloseBasedOn}`);
    });

    const unprocessedPart = memoize((): TreePartBuild | undefined => {
      const pos = closePosition();
      if (!pos) return undefined;
      return TreePartBuild.make(mTokenRange.clone(start(), pos), lineCont);
    });

    const remainingRange = memoize((): TokenRange => {
      const pos = closePosition();
      if (!pos) {
        throw Error('call and test against unprocessedPart first');
      }
      return mTokenRange.clone(Math.min(end(), pos + 1), end());
    });

    return freeze({ unprocessedPart, remainingRange, error });
  }

  return freeze({ make });
})();
