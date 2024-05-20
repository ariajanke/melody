import { TokenCollection } from './tokenization';
import { StandardErrorsFn } from './helpers';
import { PartialTreeBuild } from './partial_tree_build';
import { Helpers } from './helpers';

export interface PartialTreeNextTokenBuild {
  unprocessedPart: () => PartialTreeBuild | undefined,
  remainingRange: () => Readonly<[number, number]>,
  error: StandardErrorsFn
}

export const PartialTreeNextTokenBuild = (() => {
  const { freeze } = Object;
  const { memoize } = Helpers;

  const kCloseMapping = freeze({
    ['(']: ')'
  });

  function make(mTokens: TokenCollection, mStart: number, mEnd: number,
                mFindCloseBasedOn: string)
  {
    let mError: StandardErrorsFn = (): undefined => {};
    const { lineContinuationScheme } = PartialTreeBuild;
    const closeMapping: string | undefined = kCloseMapping[mFindCloseBasedOn];
    const lineCont = closeMapping ?
      lineContinuationScheme.inGroup :
      lineContinuationScheme.operatorContinued;

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

      mError = memoize(() => freeze({
        message: `Cannot find close position for ${mFindCloseBasedOn}`
      }));

      return undefined;
    });

    const unprocessedPart = memoize((): PartialTreeBuild | undefined => {
      const pos = closePosition();
      if (!pos) return undefined;
      return PartialTreeBuild.makeAssumeNotNewLine(mTokens, mStart, pos, lineCont);
    });

    const remainingRange = memoize((): [number, number] => {
      const pos = closePosition();
      if (!pos) {
        throw Error('call and test against unprocessedPart first');
      }
      return [Math.min(mEnd, pos + 1), mEnd];
    });

    function error() { return mError(); }

    return freeze({ unprocessedPart, remainingRange, error });
  }

  return freeze({ make });
})();
