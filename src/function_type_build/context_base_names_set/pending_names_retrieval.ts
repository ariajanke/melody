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

import {
  ChildFunctionDefinition,
  DeclarationNamesRetrieval,
  NameDeclaration,
  WritableNameSet,
  NameSet
} from './declaration_names_retrieval';
import { Helpers } from '../../helpers';
import { FunctionNamingSchema } from '../../function_naming_schema';

const { freeze, memoize, makeIsStringInLookUpTable } = Helpers;

export interface PendingNamesRetrieval {
  /// any name which must be defined, which is not used by this frame
  unclaimedNames(): Readonly<string[]>;
  /// any name which must be defined, which this frame uses
  pendingNames(): Readonly<string[]>;
  refersToParent(): boolean;
};

const accumulateNames = (set: WritableNameSet, name: string): WritableNameSet => {
  set[name] = true;
  return set;
};

const { mapToFringeAccessor, mapToAssignment } = FunctionNamingSchema;

function make
  (mDeclNames: DeclarationNamesRetrieval,
   mIsBuiltinName: (name: string) => boolean,
   mGetChildPending: (uid: number) => PendingNamesRetrieval): PendingNamesRetrieval
{
  const { declarations, usedNames, childDefinitions } = mDeclNames;

  const declaredNames = ((): Readonly<string[]> =>
    declarations().reduce((res: string[], v: NameDeclaration): string[] => {
      return v.names.reduce((res: string[], name: string): string[] => {
        // TODO marry with OrderedInitialSetsCollection's logic around
        //      accessor/modifier names
        // NOTE if called... add (we're assuming it's a function)
        // TODO remove this assumption
        if (totalUsedNames()[name]) {
          res.push(name);
        }
        res.push(mapToFringeAccessor(name));
        if (v.type === ':=') {
          res.push(mapToAssignment(name));
        }
        return res;
      }, res);
    }, [] as string[]));

  const isPendingNameFunc = memoize(() => {
    const fn = makeIsStringInLookUpTable(declaredNames());
    return (name: string) => !(mIsBuiltinName(name) || fn(name));
  });

  const totalUsedNames = memoize((): NameSet =>
    childDefinitions().
    reduce((set: WritableNameSet, definfo: ChildFunctionDefinition) => {
      const { pendingNames, unclaimedNames } = mGetChildPending(definfo.uid);
      set = pendingNames().reduce(accumulateNames, set);
      return unclaimedNames().reduce(accumulateNames, set);
    },
    usedNames()));

  const pendingNames = memoize((): Readonly<string[]> =>
    Object.keys(usedNames()).filter(isPendingNameFunc()));

  const refersToParent = memoize((): boolean =>
    unclaimedNames().length > 0 || pendingNames().length > 0);

  const unclaimedNames = memoize((): Readonly<string[]> => {
    if (childDefinitions().length === 0)
      { return []; }

    const accumulateNameIfPending = (set: WritableNameSet, name: string): WritableNameSet => {
      if (isPendingNameFunc()(name))
        { set[name] = true; }
      return set;
    };

    return Object.keys(childDefinitions().
      reduce((set: WritableNameSet, definfo: ChildFunctionDefinition): WritableNameSet => {
        const { pendingNames, unclaimedNames } = mGetChildPending(definfo.uid);
        set = pendingNames().reduce(accumulateNameIfPending, set);
        return unclaimedNames().reduce(accumulateNameIfPending, set);
      },
      {} as WritableNameSet));
  });

  return freeze({ pendingNames, refersToParent, unclaimedNames });
}

export const PendingNamesRetrieval = freeze({
  make,
  accumulateNames
});
