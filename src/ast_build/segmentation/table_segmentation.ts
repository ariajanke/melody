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
import { Helpers, StandardErrorMessage } from '../../helpers';
import { Token } from '../../token';
import { Segment, Segmentation } from '../segmentation';

const { freeze, memoize } = Helpers;

export const TableSegmentation = freeze({
  isOpening(tok: Token): boolean {
    return tok.type() === Token.types.grouping.opening &&
           tok.content() === GroupingNamingSchema.kTableDefinition;
  },
  make(_0: Readonly<Token[]>, _1: number, _2: number): Segmentation {
    return freeze({
      segment: (): Segment | undefined => undefined,
      error  : memoize((): StandardErrorMessage =>
        freeze({ message: 'tables are not supported' }))
    });
  }
});
