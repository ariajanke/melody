import { Helpers, StandardError, StandardErrorFn } from '../helpers';
import { TreePartBuild, LineContinuationScheme } from './tree_part_build';
import { TokenRange } from '../token_range';
import { Token } from '../token';

export interface TreePartTupleDivision {
  leftPart: () => TreePartBuild | undefined,
  rightPart: () => TreePartBuild,
  error: StandardErrorFn
}

export const TreePartTupleDivision = (() => {
  const { memoize, freeze } = Helpers;

  const kCloseMapping = freeze({
    ['(']: ')',
    // ['fn']: 'end'
  });

  const class_ = freeze({
    make: (mTokenRange: TokenRange, mOperatorToken: Token) =>
      construct(mTokenRange, mOperatorToken.content())
  });

  function construct(mTokenRange: TokenRange, mFindCloseBasedOn: string) {
    const { error, setErrorMessage } = StandardError.make();
    const { start, end, parentContainerSize, tokenAt } = mTokenRange;
    const mCloseMapping: string | undefined = kCloseMapping[mFindCloseBasedOn];

    // an "operator" may or may not have an explicit close
    const closePosition = memoize(() => {
      if (!mCloseMapping) {
        // not necessary try to find the new line
        return end();
      } 

      const count: number = parentContainerSize();
      for (let i = start(); i < count; ++i) {
        if (tokenAt(i).content() === mCloseMapping) {
          // reminder: i is one past the last element for our range
          return i;
        }
      }

      return setErrorMessage(`Cannot find close position for ${mFindCloseBasedOn}`);
    });

    const inst: TreePartTupleDivision = freeze({
      leftPart: memoize((): TreePartBuild | undefined => {
        const pos = closePosition();
        if (!pos) return undefined;

        const lineCont = mCloseMapping ?
          LineContinuationScheme.inGroup :
          LineContinuationScheme.operatorContinued;
        return TreePartBuild.make(mTokenRange.clone(start(), pos), lineCont);
      }),

      rightPart: memoize((): TreePartBuild => {
        const pos = closePosition();
        if (!pos) {
          throw Error('call and test against leftPart first');
        }
        const start = Math.min(end(), pos + 1);
        return TreePartBuild.
          make(mTokenRange.clone(start, end()), LineContinuationScheme.normal);
      }),

      error
    });

    return inst;
  }

  return class_;
})();
