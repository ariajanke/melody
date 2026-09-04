import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise, StandardError } from '../helpers';
import { Token } from '../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { ClosingPair } from './expression_segmentation';
import { LineSegmentation } from './line_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

const kClosing = Token.types.grouping.closing;

export const FunctionBodySegmentation = freeze({
  isBodyClosing(token: Token | undefined) {
    return token?.type() === kClosing &&
           token?.content() === GroupingNamingSchema.kBodyClose;
  },
  assertIsClosing(token: Token | undefined) {
    if (token === undefined || token.type() === kClosing)
      { return; }
    raise('body must end on a closing');
  },
  // strategy: memoize((): ExpressionScanningStrategy => freeze({
  //   assertIsOpening(token: Token | undefined) {
  //     ParentheticalSegmentation.assertIsOpening(token);
  //   },
  //   isAbruptClosing(token: Token | undefined): boolean {
  //     return Segment.isClosing(token);
  //   },
  //   isProperClosing(token: Token | undefined): boolean {
  //     return token?.type() === kClosing &&
  //            token?.content() === GroupingNamingSchema.kParentheticalClose;
  //   },
  //   continuesFor(token: Token): boolean {
  //     const { type } = token;
  //     return type() === kClosing ||
  //            type() === Token.types.identifier ||
  //            Token.isLiteral(token) ||
  //            type() === Token.types.operator;
  //   },
  //   groupingConstructorFor: Segment.groupingConstructorFor
  // })),
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    FunctionBodySegmentation.assertIsClosing(mTokens[mEnd]);
    const { error, setErrorFn } = StandardError.make();

    const closingPair = memoize((): ClosingPair | undefined => {
      let childGatherer = ChildSegmentGatherer.defaultEmpty();
      let idx = mStart;
      while (idx < mEnd) {
        if (FunctionBodySegmentation.isBodyClosing(mTokens[idx]))
          { break; }

        const { segment, error } = LineSegmentation.make(mTokens, idx, mEnd);
        if (!segment())
          { return setErrorFn(error); }

        childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
        idx = segment()!.end();
      }

      return freeze({
        index: idx,
        children: childGatherer.children,
      });
    });

    const segment = memoize((): Segment | undefined => {
      if (!closingPair())
        { return undefined; }

      return freeze({
        type    : () => 'functionDefinitionBody',
        start   : () => mStart,
        end     : () => closingPair()!.index,
        children: closingPair()!.children
      });
    });
    
    return freeze({ segment, error });
  }
});
