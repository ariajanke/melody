import { Helpers, raise, StandardError } from '../helpers';
import { Token } from '../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { Segment, Segmentation, SegmentationConstructor } from './segment';

const { freeze, memoize } = Helpers;

export type ExpressionClosingType = 'proper' | 'hard' | 'abrupt';

export interface ExpressionScanningStrategy {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
  assertIsOpening(token: Token | undefined): void;
  // isAbruptClosing(token: Token | undefined): boolean;
  // isProperClosing(token: Token | undefined): boolean;
  closingTypeOf(token: Token | undefined): ExpressionClosingType | undefined;
  continuesFor(token: Token): boolean;
  // intoSegment(start: number, pair: ClosingPair): Segment;
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
      const closing = mScanStrat.closingTypeOf(token);
      if (closing === 'abrupt')
        { return setErrorMessage(`abruptly closed at ${idx}`); }
      if (closing === 'proper')
        { return freeze({ index: idx, children: childGatherer.children }); }
      if (closing === 'hard')
        { return freeze({ index: idx - 1, children: childGatherer.children }); }

      // if (mScanStrat.isProperClosing(token))
        

      // abrupt closing is not an error?
      // does this imply that the closing index is "-1" instread?
      // parans must be closed properly!
      // running out of tokens is a proper close in the function def/line case
      // but running out is "abrupt" in the paren case
      // if (mScanStrat.isAbruptClosing(token))
      //   { return setErrorMessage(`unexpected close found at ${idx}`); }

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
      children,
      start: () => mStart,
      // NOTE closing is part of the expression
      end: () => index + 1,
      type: () => 'expression'
    });
  });

  return freeze({ segment, error });
}

export const ExpressionSegmentation = freeze({ make });
