import { Helpers, raise, StandardError } from '../helpers';
import { Token } from '../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { Segment, Segmentation, SegmentationConstructor } from './segment';

const { freeze, memoize } = Helpers;

export interface ExpressionScanningStrategy {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
  assertIsOpening(token: Token | undefined): void;
  isAbruptClosing(token: Token | undefined): boolean;
  isProperClosing(token: Token | undefined): boolean;
  continuesFor(token: Token): boolean;
};

export type ClosingPair = Readonly<{
  index: number;
  children(): Readonly<Segment[]>;
}>;

function make
  (mTokens: Readonly<Token[]>,
   mStart: number,
   mEnd: number,
   mScanStrat: ExpressionScanningStrategy): Segmentation
{
  mScanStrat.assertIsOpening(mTokens[mStart]);
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  
  const closingPair = memoize((): ClosingPair | undefined => {
    let childGatherer = ChildSegmentGatherer.defaultEmpty();
    for (let idx = mStart + 1; idx < mEnd; ) {
      const token: Token | undefined = mTokens[idx];
      if (mScanStrat.isAbruptClosing(mTokens[idx]))
        { return setErrorMessage(`unexpected close found at ${idx}`); }

      if (mScanStrat.isProperClosing(mTokens[idx]))
        { return freeze({ index: idx + 1, children: childGatherer.children }); }

      const ctor = mScanStrat.groupingConstructorFor(token);
      if (ctor) {
        const { segment, error } = ctor(mTokens, idx, mEnd);
        if (!segment()) {
          return setErrorFn(error);
        }
        idx = segment()!.end();
        childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
        continue;
      }

      if (mScanStrat.continuesFor(token)) {
        ++idx;
        continue;
      }

      raise(`Unhandled token type "${token.type()}", content "${token.content()}"`);
    }
    return freeze({ index: mEnd, children: childGatherer.children });
  });

  const segment = memoize((): Segment | undefined => {
    if (!closingPair())
      { return undefined; }

    const { index, children } = closingPair()!;
    return freeze({
      type : () => 'expression',
      start: () => mStart,
      end  : () => index,
      children
    });
  });

  return freeze({ segment, error });
}

export const ExpressionSegmentation = freeze({ make });
