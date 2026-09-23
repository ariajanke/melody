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

import { TableSegmentation } from './table_segmentation';
import { FunctionDefinitionSegmentation } from './function_definition_segmentation';
import { ParentheticalSegmentation } from './parenthetical_segmentation';
import { Segment, Segmentation, SegmentationConstructor } from '../segmentation';
import { Token } from '../../token';
import { FunctionBodySegmentation } from './function_body_segmentation';

Segment.initializeThisClass({
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined { 
    if (ParentheticalSegmentation.isOpening(token))
      { return ParentheticalSegmentation.make; }

    if (FunctionDefinitionSegmentation.isOpening(token))
      { return FunctionDefinitionSegmentation.make; }

    if (TableSegmentation.isOpening(token))
      { return TableSegmentation.make; }

    return undefined;
  }
});

const { isEndOfInput } = FunctionBodySegmentation;

Segmentation.initializeThisClass({
  makeInitialSegmentation(mTokens: Readonly<Token[]>): Segmentation {
    return FunctionBodySegmentation.
      make(mTokens, 0, mTokens.length, isEndOfInput);
  },
});
