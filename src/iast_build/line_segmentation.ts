import { Helpers } from '../helpers';
import { Token } from '../token';
import { ExpressionScanningStrategy, ExpressionSegmentation } from './expression_segmentation';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

export const LineSegmentation = freeze({
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    assertIsOpening(token: Token | undefined) {
      return token !== undefined;
    },
    isAbruptClosing(token: Token | undefined): boolean {
      return Segment.isClosing(token);
    },
    isProperClosing(token: Token | undefined): boolean {
      return token?.type() === Token.types.separator ||
             FunctionBodySegmentation.isBodyClosing(token);
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.identifier ||
             Token.isLiteral(token) ||
             type() === Token.types.operator;
    },
    groupingConstructorFor: Segment.groupingConstructorFor
  })),
  make(mTokens: Readonly<Token[]>,
        mStart: number,
        mEnd: number): Segmentation
  {
    return ExpressionSegmentation.
      make(mTokens, mStart, mEnd, LineSegmentation.strategy());
  }
});
