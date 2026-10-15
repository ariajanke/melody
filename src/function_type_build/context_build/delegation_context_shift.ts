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

import { Helpers, StandardError } from '../../helpers';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../melody_components';
import { UsedContextNames } from '../context_names_tree_set';
import { FunctionTypeFactory } from '../function_type_association_set';
import { AncestorInfo } from './ancestor_collection';
import { ContextShift, ContextShiftTask } from './task_controller';
import { UsedAncestorCollection } from './used_ancestor_collection';

const { memoize, freeze } = Helpers;

const isNotUndefined = <T>(obj: T | undefined): boolean => obj !== undefined;

const emptyAllocations = memoize((): ReturnType<ContextShift['allocations']> => []);

function makeShift
  (mContextNames: UsedContextNames,
   mUsedAncestors: UsedAncestorCollection,
   mFactory: FunctionTypeFactory): ContextShift
{
  const { pendingNames } = mContextNames;

  const additionalMethods = memoize((): Readonly<[string, FunctionType][]> =>
    mUsedAncestors.ancestors().map((anc: AncestorInfo): [string, FunctionType] =>
      [anc.variableName, mFactory.makeUnassociated(undefined, undefined, anc.type)]));

  const additionalLookUps = memoize((): Readonly<[string, FunctionLookUpTable][]> =>
    Object.
      keys(pendingNames()).
      map((pendingName: string): [string, FunctionLookUpTable] | undefined => {
        const ftbl = mUsedAncestors.mapNameToAncestor(pendingName)?.lookUp(pendingName);
        if (!ftbl) {
          // NOTE if a method cannot be delegated, leave it undefined
          //      if the call is still missing, we will later generate the
          //      appropriate missing method error
          return undefined;
        }
        
        return [pendingName, ftbl];
      }).
      filter(isNotUndefined) as [string, FunctionLookUpTable][]);

  const associations = memoize(() => freeze({
    additionalMethods,
    additionalLookUps
  }));

  return freeze({
    associations,
    allocations: emptyAllocations,
    error: () => StandardError.make().error()
  });
}

export const DelegationContextShift = freeze({ make: makeShift });

// function make
//   (mContextNames: UsedContextNames,
//    mUsedAncestors: UsedAncestorCollection): ContextShiftTask
// {
//   function run(
//     _0: ObjectType,
//     factory: FunctionTypeFactory): ContextShift
//   {
//     return makeShift(mContextNames, mUsedAncestors, factory);
//   }

//   return freeze({ run });
// }

// export const DelegationShiftTask = freeze({ make });
