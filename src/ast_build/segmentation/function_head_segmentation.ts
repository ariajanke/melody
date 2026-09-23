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

import { Helpers, raise, StandardError } from '../../helpers';
import { Token } from '../../token';
import { ChildSegmentGatherer } from './child_segment_gatherer';
import { FunctionDefinitionSegmentation } from './function_definition_segmentation';
import { ParentheticalSegmentation } from './parenthetical_segmentation';
import { Segment, Segmentation } from '../segmentation';

const { freeze, memoize } = Helpers;

const kSeparator = Token.types.grouping.separator;

const kEmptyHead = freeze({
  type    : () => 'expression',
  start   : (): number => raise('must define start'),
  end     : (): number => raise('must define end'),
  children: ChildSegmentGatherer.defaultEmpty().children
});

const emptySegmentAt = (posFn: () => number): Segment =>
  freeze({ ...kEmptyHead, start: posFn, end: posFn });

function make
  (mTokens: Readonly<Token[]>, mStart: number, mEnd: number): Segmentation
{
  FunctionDefinitionSegmentation.assertIsOpening(mTokens[mStart]);
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  const isParentheticalOpening = ParentheticalSegmentation.isOpening;

  const headStart = memoize((): number | undefined => {
    let separatorCount = 0;
    for (let idx = mStart + 1; idx < mEnd; ++idx) {
      const token = mTokens[idx];

      if (isParentheticalOpening(token) || Segment.isClosing(token))
        { return idx; }

      if (token.type() === kSeparator) {
        // NOTE at most one separator until the head
        ++separatorCount;
        if (separatorCount > 1) {
          return setErrorMessage('Too many new lines with no head/body found');
        }

        continue;
      }

      return idx - separatorCount;
    }

    return mEnd;
  });

  const segment = memoize((): Segment | undefined => {
    if (headStart() === undefined)
      { return undefined; }

    const start = mTokens[headStart()!];
    if (!isParentheticalOpening(start))
      { return emptySegmentAt(headStart as () => number); }
    
    const parenthetical = ParentheticalSegmentation.
      make(mTokens, headStart()!, mEnd);
    return parenthetical.segment() ?? setErrorFn(parenthetical.error);
  });

  return freeze({ segment, error });
}

export const FunctionHeadSegmentation = freeze({ make });
