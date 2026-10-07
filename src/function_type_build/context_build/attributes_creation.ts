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

// import { FunctionLookUpTable, FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../melody_components';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { CallAttributeCreation } from './call_attribute_creation';
import { ContextAttributeFactory } from './context_attribute_factory';
import { OrderedInitialSetsCollection, VariableNameFunctions } from './ordered_initial_sets_collection';
// import { VariableAllocation } from './variable_allocation';

export type AttributesTuple = Readonly<[string, FunctionLookUpTable]>;

export interface AttributesCreation {
  // NOTE absence is not an error
  accessor(): AttributesTuple | undefined;
  modifier(): AttributesTuple | undefined;
  call(): AttributesTuple | undefined;
};

const { freeze, memoize } = Helpers;

function make
  (mReferenceType: ObjectType,
   mVariableName: string,
   mFunctionNames: VariableNameFunctions,
   mVariableType: ObjectType)
  : AttributesCreation
{
  const toFunctionTable = MutableFunctionTable.fromFunctionType;

  const { accessorName, modifierName } = mFunctionNames;

  const accessorFtype = memoize((): FunctionType | undefined => {
    if (!accessorName)
      { return undefined; }

    return FunctionTypeBase.make( mReferenceType, undefined, mVariableType);
  });

  const accessor = memoize((): AttributesTuple | undefined => {
    if (!accessorFtype())
      { return undefined; }

    return [accessorName!, toFunctionTable(accessorFtype()!)];
  });

  const modifier = memoize((): AttributesTuple | undefined => {
    if (!modifierName)
      { return undefined; }

    const ftype = FunctionTypeBase.make(mReferenceType, mVariableType, mVariableType);

    return [modifierName, toFunctionTable(ftype)];
  });

  const call = memoize((): AttributesTuple | undefined => {
    if (!accessorFtype())
      { return undefined; }

    const ftype = CallAttributeCreation.of(accessorFtype()!);
    if (!ftype)
      { return undefined; }

    return [mVariableName, toFunctionTable(ftype)];
  });

  return freeze({ accessor, modifier, call });
}

export const AttributesCreation = freeze({ make });
