/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

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
