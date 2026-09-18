import { GroupingNamingSchema } from '../../grouping_naming_schema';
import { Helpers, raise } from '../../helpers';
import { Token } from '../../token';
import {
  ExpressionClosingType,
  ExpressionScanningStrategy,
  ExpressionSegmentation
} from './expression_segmentation';
import { FunctionBodySegmentation } from './function_body_segmentation';
import { LineSegmentation } from './line_segmentation';
import { Segment, Segmentation } from '../segmentation';

const { freeze, memoize } = Helpers;

export const ParentheticalSegmentation = freeze({
  isOpening(token: Token | undefined): boolean {
    return token !== undefined &&
           token.content() === GroupingNamingSchema.kParentheticalOpen &&
           token.type() === 'opening';
  },
  assertIsOpening(token: Token | undefined): void {
    if (ParentheticalSegmentation.isOpening(token))
      { return; }

    raise(`"${token?.content() ?? '<EMPTY>'}" is not a parenthetical opening`);
  },
  strategy: memoize((): ExpressionScanningStrategy => freeze({
    isOpening: ParentheticalSegmentation.isOpening,
    closingTypeOf(token: Token | undefined): ExpressionClosingType | undefined {
      if (token === undefined ||
          FunctionBodySegmentation.isBodyClosing(token))
        { return 'abrupt'; }

      if (token.type() === Token.types.grouping.closing &&
          token.content() === GroupingNamingSchema.kParentheticalClose)
        { return 'proper'; }

      return undefined;
    },
    continuesFor(token: Token): boolean {
      const { type } = token;
      return type() === Token.types.grouping.separator ||
             LineSegmentation.strategy().continuesFor(token);
    },
    groupingConstructorFor: Segment.groupingConstructorFor,
  })),
  make(mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation {
    ParentheticalSegmentation.assertIsOpening(mTokens[mStart]);
    return ExpressionSegmentation.
      make(mTokens, mStart, mEnd, ParentheticalSegmentation.strategy());
  }
});
