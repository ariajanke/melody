import { Helpers, raise, StandardError } from '../../helpers';
import { Token } from '../../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { Segment, Segmentation, SegmentationConstructor } from '../segmentation';

const { freeze, memoize } = Helpers;

export type ExpressionClosingType = 'proper' | 'hard' | 'abrupt';

export interface ExpressionScanningStrategy {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
  isOpening(token: Token | undefined): boolean;
  closingTypeOf(token: Token | undefined): ExpressionClosingType | undefined;
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
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  
  const closingPair = memoize((): ClosingPair | undefined => {
    let childGatherer = ChildSegmentGatherer.defaultEmpty();
    let idx = mStart;
    if (mScanStrat.isOpening(mTokens[idx]))
      { idx++; }
    while (idx < mEnd) {
      const token: Token | undefined = mTokens[idx];
      const closing = mScanStrat.closingTypeOf(token);
      if (closing === 'abrupt')
        { return setErrorMessage(`abruptly closed at ${idx}`); }

      if (closing === 'proper') { 
        // NOTE closing is part of the expression
        return freeze({ index: idx + 1, children: childGatherer.children });
      }

      if (closing === 'hard')
        { return freeze({ index: idx, children: childGatherer.children }); }

      const ctor = mScanStrat.groupingConstructorFor(token);
      if (ctor) {
        const { segment, error } = ctor(mTokens, idx, mEnd);
        if (!segment())
          { return setErrorFn(error); }

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
      children,
      start: () => mStart,
      end  : () => index,
      type : () => 'expression'
    });
  });

  return freeze({ segment, error });
}

export const ExpressionSegmentation = freeze({ make });
