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
import { MutableFunctionTable } from '../mutable_function_table';
import { AncestorInfo } from './ancestor_collection';
import { ContextAttributeFactory } from './context_attribute_factory';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { VariableAllocation, VariableOffset } from './variable_allocation';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

export interface ContextAncestorAccessorsStage {
  writableReferenceType(): WritableObjectType;
};

function variableOffsetIntoLookUp
  (varOffset: VariableOffset): FunctionLookUpTable
{
  const ftype = ContextAttributeFactory.
    buildReceiverGetter(varOffset.accessIndex, varOffset.type);

  return MutableFunctionTable.fromFunctionType(ftype);
}

function addParentLookUp
  (wobj: WritableObjectType, vName: string, varOffset: VariableOffset)
{
  const { kParentName, mapToFringeAccessor } = FunctionNamingSchema;

  const fLookUp = variableOffsetIntoLookUp(varOffset);

  const parentAccessorName = mapToFringeAccessor(vName);

  // NOTE we add a generic <parent> for subsequent ancestor tuple emission
  //      and one named version for receiver resolutions
  wobj = wobj.setFunctionLookUp(kParentName, fLookUp);
  return wobj.setFunctionLookUp(parentAccessorName, fLookUp);
}

function make
  (mVariableAllocation: VariableAllocation,
   mUsedAncestorCollection: UsedAncestorCollection,
   mCurrentContextReferenceType: WritableObjectType)
  : ContextAncestorAccessorsStage
{
  const { parent } = mUsedAncestorCollection;
  const { mapToFringeAccessor } = FunctionNamingSchema;

  const parentAddedContext = (): WritableObjectType => {
    if (!parent())
      { return mCurrentContextReferenceType; }

    const variableOffset =
      mVariableAllocation.lookUp(parent()!.variableName) ??
      raise('used ancestors is not consistent with variable allocations');

    return addParentLookUp(mCurrentContextReferenceType,
                           parent()!.variableName,
                           variableOffset);
  };

  function makeAccessorFor(variableName: string) {
    const varInfo = mVariableAllocation.lookUp(variableName);
    if (!varInfo) {
      raise(`Excepted variable '${variableName}' to be defined`);
    }

    // NOTE must be simple emits for receiver resolution to work
    return variableOffsetIntoLookUp(varInfo);
  }

  const writableReferenceType = memoize((): WritableObjectType =>
    mUsedAncestorCollection.
      ancestors().
      reduce((frame: WritableObjectType, info: AncestorInfo) =>
        frame.setFunctionLookUp(mapToFringeAccessor(info.variableName),
                                makeAccessorFor(info.variableName)),
        parentAddedContext()));

  return freeze({ writableReferenceType });
}

export const ContextAncestorAccessorsStage = freeze({
  make,
  testing: { addParentLookUp }
});
