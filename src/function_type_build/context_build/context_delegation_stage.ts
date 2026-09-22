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
import { FunctionLookUpTable } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';
import { ContextDeclarationBuild } from '../context_build';
import { TupleObjectType } from '../tuple_object_type';
import { DeclarationBuildConstructor } from './context_link_stage';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

export interface ContextDelegationStage_ {
  next(declarations: Readonly<NameDeclaration[]>): ContextDeclarationBuild;
};

function make
  (mPendingNames: { [name: string]: true },
   mUsedAncestorCollection: UsedAncestorCollection,
   mWritableReferenceType: WritableObjectType,
   mIntoDeclarationBuild: DeclarationBuildConstructor)
: ContextDelegationStage_
{

  function lookUpName(name: string): FunctionLookUpTable {
    return mUsedAncestorCollection.mapNameToAncestor(name)?.lookUp(name) ??
           raise(`Could not find pending name '${name}'`);
  }

  function checkAndDelegateCallable
    (wobj: WritableObjectType,
     fname: string,
    ): WritableObjectType
  {
    if (!FunctionNamingSchema.isAFringeAccessorName(fname))
      { return wobj; }

    const isCallable = mUsedAncestorCollection.
      mapNameToAncestor(fname)?.
      lookUp(fname)?.
      byParameters(TupleObjectType.emptyTuple())?.
      returns()?.
      lookUp(OperatorNamingSchema.kCall);
    
    if (!isCallable)
      { return wobj; }

    const callname =
      FunctionNamingSchema.mapFromFringeAccessor(fname) ??
      raise('no callname for callable?');
    return wobj.setFunctionLookUp(callname, lookUpName(callname));
  }

  const writableReferenceType = memoize(() =>
    Object.
      keys(mPendingNames).
      reduce((refType: WritableObjectType, name: string) => {
        if (name === FunctionNamingSchema.kParentName)
          { return refType; }
        
        refType = checkAndDelegateCallable(refType, name);
        return refType.setFunctionLookUp(name, lookUpName(name));
      }, mWritableReferenceType));

  function next
    (declarations: Readonly<NameDeclaration[]>)
  {
    return mIntoDeclarationBuild(declarations, writableReferenceType());
  }

  return freeze({ next });
}

export const ContextDelegationStage_ = freeze({ make });
