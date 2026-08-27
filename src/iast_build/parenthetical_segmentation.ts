import { GroupingNamingSchema } from '../grouping_naming_schema';
import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { ExpressionScanningStrategy, ExpressionSegmentation } from './expression_segmentation';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { LineSegmentation } from './line_segmentation';
import { Segment, Segmentation } from './segment';

const { freeze, memoize } = Helpers;

export const ParentheticalSegmentation = freeze({
  isOpening(token: Token): boolean {
    return token.content() === GroupingNamingSchema.kParentheticalOpen &&
           token.type() === 'opening';
  },
  assertIsOpening(token: Token | undefined): void {
    if (token && ParentheticalSegmentation.isOpening(token))
      { return; }
    raise(`"${token?.content() ?? '<EMPTY>'}" is not a parenthetical opening`);
  },
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    assertIsOpening(token: Token | undefined) {
      ParentheticalSegmentation.assertIsOpening(token);
    },
    isAbruptClosing(token: Token | undefined): boolean {
      return token === undefined ||
             FunctionBodySegmentation.isBodyClosing(token);
    },
    isProperClosing(token: Token | undefined): boolean {
      return token?.type() === Token.types.closing &&
             token?.content() === GroupingNamingSchema.kParentheticalClose;
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.separator ||
             LineSegmentation.strategy().continuesFor(token);
    },
    groupingConstructorFor: Segment.groupingConstructorFor
  })),
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    return ExpressionSegmentation.
      make(mTokens, mStart, mEnd, ParentheticalSegmentation.strategy());
  }
});
