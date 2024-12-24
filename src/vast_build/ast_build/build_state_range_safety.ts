import { Helpers } from '../../helpers';

const { freeze } = Helpers;

export interface BuildStateRangeSafety {
  verifyRange: ({ start, end }: { start: number, end: number }) => void,
  noteNodeAddition: () => void,
  resetSafetyCounts: () => void
};

export const BuildStateRangeSafety = freeze({
  make: (): BuildStateRangeSafety => {
    let mLastRange = Infinity;
    let mSizeSinceLastPop = 0;
    let mToleratedEqualRanges = 0;
    let mNodeActivity = false;

    const verifyDecreasing = () => {
      if (mToleratedEqualRanges < 2 && mLastRange === mSizeSinceLastPop) { 
        ++mToleratedEqualRanges;
        return;
      } else if (mSizeSinceLastPop < mLastRange) {
        return;
      }
      throw new Error('build state range not decreasing, probable infinite loop caught');
    };

    return freeze({
      verifyRange: ({ start, end }: { start: number, end: number }) => {
        mSizeSinceLastPop += (end - start);
        verifyDecreasing();
      },
      noteNodeAddition: () => {
        mNodeActivity = true;
      },
      resetSafetyCounts: () => {
        if (!mNodeActivity)
          mLastRange = mSizeSinceLastPop;
        mSizeSinceLastPop = 0;
        mToleratedEqualRanges = 0;
        mNodeActivity = false;
      }
    });
  }
});
