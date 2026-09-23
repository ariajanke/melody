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

import { Helpers, raise } from '../../helpers';
import { Segment } from '../segmentation';

const { freeze, memoize } = Helpers;

export interface ChildSegmentGatherer {
  children(): Readonly<Segment[]>;
  pushChild(seg: Segment): ChildSegmentGatherer;
  ensureMutable(): ChildSegmentGatherer;
};

export const ChildSegmentGatherer = freeze({
  defaultEmpty: memoize((): ChildSegmentGatherer => freeze({
    children: memoize((): Readonly<Segment[]> => []),
    pushChild(_0: Segment) { raise('must ensure mutable'); },
    ensureMutable(): ChildSegmentGatherer {
      const mChildren: Segment[] = [];
      const inst: ChildSegmentGatherer = freeze({
        children: () => mChildren,
        pushChild(seg: Segment): ChildSegmentGatherer {
          mChildren.push(seg);
          return inst;
        },
        ensureMutable: () => inst
      });
      return inst;
    }
  }))
});
