import { Helpers } from '../helpers';
import { Token } from '../token';
import {
  ExpressionClosingType,
  ExpressionScanningStrategy,
  ExpressionSegmentation
} from './expression_segmentation';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

const kSeparator = Token.types.grouping.separator;

export const LineSegmentation = freeze({
  isProperClose(token: Token | undefined): boolean {
    return token?.type() === kSeparator;
  },
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    isOpening(_0: Token | undefined)
      { return false; },
    closingTypeOf(token: Token | undefined): ExpressionClosingType | undefined {
      if (token === undefined ||
          FunctionBodySegmentation.isBodyClosing(token) ||
          LineSegmentation.isProperClose(token))
        { return 'hard'; }

      return undefined;
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.identifier ||
             Token.isLiteral(token) ||
             type() === Token.types.operator;
    },
    groupingConstructorFor: Segment.groupingConstructorFor,
  })),
  make(mTokens: Readonly<Token[]>,
       mStart: number,
       mEnd: number): Segmentation
  {
    // TODO rm me when finished debugging
    const inst = ExpressionSegmentation.
      make(mTokens, mStart, mEnd, LineSegmentation.strategy());
    return freeze({
      segment: () => inst.segment(),
      error: inst.error
    });
  }
});
