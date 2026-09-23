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
