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

import { FunctionNamingSchema } from '../../function_naming_schema';
import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';

const { freeze, memoize } = Helpers;

export interface AncestorInfo {
  type: ObjectType;
  variableName: string;
};

export interface AncestorCollection {
  /// order as follows: from least to most deep
  allAncestorsOrdered(): Readonly<AncestorInfo[]>;
  parentReference(): ObjectType | undefined;
  parentUniqueName(): string | undefined;
  searchForOriginalByName(fName: string): ObjectType | undefined;
};

const kDepthToParent = 0;

function make(mStackThing: ContextFrameStack): AncestorCollection {
  const { atDepth } = mStackThing;

  function searchName_(name: string, idx: number): ObjectType | undefined {
    if (name === FunctionNamingSchema.kParentName)
      { raise('should not call with parent'); }

    const ancestor = atDepth(idx)?.referenceType();
    if (!ancestor)
      { return undefined; }

    const fLookUp = ancestor.lookUp(name);
    if (!fLookUp)
      { return searchName_(name, idx + 1); }

    const ftype = fLookUp.uniqueFunctionType();
    if (!ftype)
      { return undefined; }

    if (ftype.receiver().uid() !== ancestor.uid())
      { return searchName_(name, idx + 1); }

    return ancestor;
  }

  const allAncestorsOrdered = memoize((): Readonly<AncestorInfo[]> => {
    const rv: AncestorInfo[] = [];
    const kSkipParent = 1;
    for (let i = kSkipParent; ; ++i) {
      if (!atDepth(i))
        { break; }

      const { referenceType, uniqueName } = atDepth(i)!;
      rv.push({ type: referenceType(), variableName: uniqueName() });
    }
    return rv;
  });

  const parentReference = memoize(() => atDepth(kDepthToParent)?.referenceType());

  const parentUniqueName = memoize(() => atDepth(kDepthToParent)?.uniqueName());

  const searchForOriginalByName = (name: string): ObjectType | undefined =>
    searchName_(name, kDepthToParent);

  return freeze({
    allAncestorsOrdered,
    parentReference,
    parentUniqueName,
    searchForOriginalByName,
  });
}

export const AncestorCollection = freeze({ make });
