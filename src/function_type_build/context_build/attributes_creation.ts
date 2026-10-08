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
import { FunctionType, ObjectType } from '../../melody_components';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { FunctionTypeAssociationSet } from './function_type_association_set';
import { VariableNameFunctions } from './ordered_initial_sets_collection';

export type AttributesTuple = Readonly<[string, FunctionType]>;

export interface AttributesCreation {
  // NOTE absence is not an error
  accessor(): AttributesTuple | undefined;
  modifier(): AttributesTuple | undefined;
  call(): AttributesTuple | undefined;
  associationSet(): FunctionTypeAssociationSet;
};

const { freeze, memoize } = Helpers;

function make
  (mReferenceType: ObjectType,
   mVariableName: string,
   mFunctionNames: VariableNameFunctions,
   mVariableType: ObjectType,
   mFunctionTypeFactory: () => FunctionTypeAssociationSet)
  : AttributesCreation
{
  const { makeUnassociated } = mFunctionTypeFactory();
  const { accessorName, modifierName } = mFunctionNames;

  const accessorFtype = memoize((): FunctionType | undefined => {
    if (!accessorName)
      { return undefined; }

    return makeUnassociated( mReferenceType, undefined, mVariableType);
  });

  const accessor = memoize((): AttributesTuple | undefined => {
    if (!accessorFtype())
      { return undefined; }

    return [accessorName!, accessorFtype()!];
  });

  const modifier = memoize((): AttributesTuple | undefined => {
    if (!modifierName)
      { return undefined; }

    const ftype = makeUnassociated(mReferenceType, mVariableType, mVariableType);
    return [modifierName, ftype];
  });

  const call = memoize((): AttributesTuple | undefined => {
    const lookUpTable = mVariableType.lookUp(OperatorNamingSchema.kCall)
    if (!accessorFtype() || !lookUpTable)
      { return undefined; }

    // this is okay in one case: the immediate ftype
    const repFtype = lookUpTable.uniqueFunctionType();
    if (!repFtype)
      { raise('cannot support calls that do not map the a unique ftype'); }

    // unique ftype is not expected nor cannot have an emission!
    if (repFtype.emission())
      { raise('broken assumption, this representative ftype must not have an emission'); }

    const { receiver, parameters, returns } = repFtype;
    const trueFtype = makeUnassociated(receiver(), parameters(), returns());
    return [mVariableName, trueFtype];
  });
  const associationSet = mFunctionTypeFactory;

  return freeze({ accessor, modifier, call, associationSet });
}

export const AttributesCreation = freeze({ make });
