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
import { ObjectType } from '../../melody_components';
import { AttributesCreation, AttributesTuple } from './attributes_creation';
import { FunctionTypeAssociationSet } from '../function_type_association_set';
import { WritableObjectType } from './writable_object_type';
import { OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { FunctionNamingSchema } from '../../function_naming_schema';

const { freeze } = Helpers;

export interface ContextShiftFactory {
  methodPairs(): Readonly<AttributesTuple[]>;
  associationSet(): FunctionTypeAssociationSet;
  byInitializer(
    initializerType: ObjectType,
    variableNames: Readonly<string[]>,
    variableTypes: Readonly<ObjectType[]>): ContextShiftByInitializer;
};

export interface ContextShiftByInitializer {
  appendInitializer(writableContext: WritableObjectType): WritableObjectType;
  appendAttribute(writableContext: WritableObjectType, _1: string, variableIndex: number):
    WritableObjectType;
};

export const ContextShiftFactory = freeze({
  make(mVarMap: OrderedInitialSetsCollection['variableNameMap'],
       mAssociations: FunctionTypeAssociationSet = FunctionTypeAssociationSet.make())
    : ContextShiftFactory
  {
    const mAttrs: AttributesTuple[] = [];
    const methodPairs = (): Readonly<AttributesTuple[]> => mAttrs;
    const associationSet = () => mAssociations;
    function byInitializer
      (mInitializerType: ObjectType,
       mVariableNames: Readonly<string[]>,
       mVariableTypes: Readonly<ObjectType[]>): ContextShiftByInitializer
    {
      if (mVariableNames.length !== mVariableTypes.length)
        { raise('name and types size mismatch, syntax error should have been caught earlier'); }

      let mSetInitializer = false;
      function appendInitializer(writableContext: WritableObjectType): WritableObjectType {
        if (mSetInitializer)
          { raise('already set initializer'); }

        const initializerName = FunctionNamingSchema.mapToInitialSetName(mVariableNames);
        const initializerFtype = mAssociations.makeUnassociated(writableContext, mInitializerType);
        mAttrs.push([initializerName, initializerFtype]);
        writableContext.setFunctionType(initializerName, initializerFtype);
        mSetInitializer = true;
        return writableContext;
      }

      // TODO unhandled duplicate names
      function appendAttribute
        (mWritableContext: WritableObjectType,
         _1: string,
         mVariableIndex: number): WritableObjectType
      {
        const mVariableType =
          mVariableTypes[mVariableIndex] ??
          raise('index out of bounds');
        const mVariableName = mVariableNames[mVariableIndex];
        const mFunctionNames = mVarMap()[mVariableName] ??
          raise(`variable "${mVariableName}" not found`);
        
        const mAttributesCreation = AttributesCreation.
          make(mWritableContext, mVariableName, mFunctionNames, mVariableType, associationSet);
        const { accessor, modifier, call } = mAttributesCreation;

        function onPair(attrFn: () => AttributesTuple | undefined) {
          const attr = attrFn();
          if (!attr)
            { return; }

          mWritableContext.setFunctionType(...attr);
          mAttrs.push(attr);
        }
        
        onPair(accessor);
        onPair(modifier);
        onPair(call);
        return mWritableContext;
      }

      return freeze({ appendAttribute, appendInitializer });
    }

    return freeze({ methodPairs, associationSet, byInitializer });
  }
});
