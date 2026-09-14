import { Helpers } from '../../helpers';
import { Token } from '../../token';
import {
  ExpressionClosingType,
  ExpressionScanningStrategy,
  ExpressionSegmentation
} from './expression_segmentation';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { Segment, Segmentation } from '../segmentation';

const { freeze, memoize } = Helpers;

const kSeparator = Token.types.grouping.separator;
const kIdentifier = Token.types.identifier;
const kOperator = Token.types.operator;

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
      const type = token.type();
      return type === kIdentifier ||
             Token.isLiteral(token) ||
             type === kOperator;
    },
    groupingConstructorFor: Segment.groupingConstructorFor,
  })),
  make(mTokens: Readonly<Token[]>,
       mStart: number,
       mEnd: number): Segmentation
  {
    return ExpressionSegmentation.
      make(mTokens, mStart, mEnd, LineSegmentation.strategy());
  }
});
