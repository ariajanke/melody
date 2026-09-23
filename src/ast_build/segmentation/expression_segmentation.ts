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
import { Segment, Segmentation, SegmentationConstructor } from '../segmentation';

const { freeze, memoize } = Helpers;

export type ExpressionClosingType = 'proper' | 'hard' | 'abrupt';

export interface ExpressionScanningStrategy {
  groupingConstructorFor(token: Token): SegmentationConstructor | undefined;
  isOpening(token: Token | undefined): boolean;
  closingTypeOf(token: Token | undefined): ExpressionClosingType | undefined;
  continuesFor(token: Token): boolean;
};

export type ClosingPair = Readonly<{
  index: number;
  children(): Readonly<Segment[]>;
}>;

function make
  (mTokens: Readonly<Token[]>,
   mStart: number,
   mEnd: number,
   mScanStrat: ExpressionScanningStrategy): Segmentation
{
  const { error, setErrorMessage, setErrorFn } = StandardError.make();
  
  const closingPair = memoize((): ClosingPair | undefined => {
    let childGatherer = ChildSegmentGatherer.defaultEmpty();
    let idx = mStart;
    if (mScanStrat.isOpening(mTokens[idx]))
      { idx++; }
    while (idx < mEnd) {
      const token: Token | undefined = mTokens[idx];
      const closing = mScanStrat.closingTypeOf(token);
      if (closing === 'abrupt')
        { return setErrorMessage(`abruptly closed at ${idx}`); }

      if (closing === 'proper') { 
        // NOTE closing is part of the expression
        return freeze({ index: idx + 1, children: childGatherer.children });
      }

      if (closing === 'hard')
        { return freeze({ index: idx, children: childGatherer.children }); }

      const ctor = mScanStrat.groupingConstructorFor(token);
      if (ctor) {
        const { segment, error } = ctor(mTokens, idx, mEnd);
        if (!segment())
          { return setErrorFn(error); }

        idx = segment()!.end();
        childGatherer = childGatherer.ensureMutable().pushChild(segment()!);
        continue;
      }

      if (mScanStrat.continuesFor(token)) {
        ++idx;
        continue;
      }

      raise(`Unhandled token type "${token.type()}", content "${token.content()}"`);
    }
    return freeze({ index: mEnd, children: childGatherer.children });
  });

  const segment = memoize((): Segment | undefined => {
    if (!closingPair())
      { return undefined; }

    const { index, children } = closingPair()!;
    return freeze({
      children,
      start: () => mStart,
      end  : () => index,
      type : () => 'expression'
    });
  });

  return freeze({ segment, error });
}

export const ExpressionSegmentation = freeze({ make });
