import { TokenCollection } from './tokenization';
import { StandardError, StandardErrorFn } from './helpers';
import { PartialTreeBuild, LineContinuationScheme } from './partial_tree_build';
import { Helpers } from './helpers';

export interface PartialTreeNextTokenBuild {
  unprocessedPart: () => PartialTreeBuild | undefined,
  remainingRange: () => Readonly<[number, number]>,
  error: StandardErrorFn
}

export const PartialTreeNextTokenBuild = (() => {
  const { memoize, freeze } = Helpers;

  const kCloseMapping = freeze({
    ['(']: ')'
  });

  function make(mTokens: TokenCollection, mStart: number, mEnd: number,
                mFindCloseBasedOn: string)
  {
    const { error, setErrorMessage } = StandardError.make();
    const closeMapping: string | undefined = kCloseMapping[mFindCloseBasedOn];
    const lineCont = closeMapping ?
      LineContinuationScheme.inGroup :
      LineContinuationScheme.operatorContinued;

    const closePosition = memoize(() => {
      if (!closeMapping) {
        // not necessary try to find the new line
        return mEnd;
      }

      const count = mTokens.count();
      for (let i = mStart; i < count; ++i) {
        if (mTokens.at(i).content() === closeMapping) {
          // reminder: i is one past the last element for our range
          return i;
        }
      }

      return setErrorMessage(`Cannot find close position for ${mFindCloseBasedOn}`);
    });

    const unprocessedPart = memoize((): PartialTreeBuild | undefined => {
      const pos = closePosition();
      if (!pos) return undefined;
      return PartialTreeBuild.make(mTokens, mStart, pos, lineCont);
    });

    const remainingRange = memoize((): Readonly<[number, number]> => {
      const pos = closePosition();
      if (!pos) {
        throw Error('call and test against unprocessedPart first');
      }
      return [Math.min(mEnd, pos + 1), mEnd];
    });

    return freeze({ unprocessedPart, remainingRange, error });
  }

  return freeze({ make });
})();
