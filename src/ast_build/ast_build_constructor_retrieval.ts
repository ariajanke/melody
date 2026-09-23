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

import { Helpers, raise, StandardErrorMessage } from '../helpers';
import { Segment, SegmentType } from './segmentation';
import { AstNode } from '../ast_node';
import { Token } from '../token';

const { freeze } = Helpers;

export interface AstBuild_ {
  node(): AstNode | undefined;
  errors(): Readonly<StandardErrorMessage[]>;
};

export type AstBuildConstructor =
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: AstBuildConstructorRetrieval) =>
  AstBuild_;

export interface AstBuildConstructorRetrieval {
  constructorFor(type: SegmentType): AstBuildConstructor;
};

let sInstance: AstBuildConstructorRetrieval | undefined = undefined;

export const AstBuildConstructorRetrieval = freeze({
  initialize(t: AstBuildConstructorRetrieval) {
    if (sInstance)
      { raise('already initialized'); }

    sInstance = t;
  },
  instance(): AstBuildConstructorRetrieval
    { return sInstance ?? raise('called before initialized'); }
});
