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

import { BuiltinFunctionNames } from '../../builtin_function_names';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, raise } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { ConstantStringType } from '../constant_string_type';
import { FunctionOpLookUp, WritableObjectType } from './writable_object_type';
import { WasmCompilation } from '../../wasm_compilation';
import { SystemIoType } from '../system_io_type';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../../melody_components';
import { TupleObjectType } from '../tuple_object_type';
import { IntegerType } from '../integer_type';
// import { ContextTypingStage_ } from './context_typing_stage';
// import { type UsedContextNames } from '../context_names_tree_set';
// import { type UsedAncestorCollection } from './used_ancestor_collection';
// import { type FunctionTypeAssociationSet } from '../function_type_association_set';

const { freeze, memoize } = Helpers;

export interface ContextBaseStage_ {
  writableReferenceType(): WritableObjectType;
  // typingStage
  //   (contextNames: UsedContextNames,
  //    usedAncestors: UsedAncestorCollection,
  //    associations: FunctionTypeAssociationSet): ContextTypingStage_;
};

function typeGetterOf(type: ObjectType): FunctionLookUpTable {
  const immediateValue = freeze({
    asInteger: () => undefined,
    asObjectType: () => type,
    uid: memoize(Symbol),
    type: () => 'immediate-value'
    // visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
    //   visitor.visitImmediateValue(immediateValue),
  });
  const ftype = freeze({
    emission: () => undefined,
    immediate: () => immediateValue,
    uid: memoize(Symbol),
    // visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
    //   visitor.visitFunctionType(ftype),
    type: () => 'function-type',
    receiver: TupleObjectType.emptyTuple,
    parameters: TupleObjectType.emptyTuple,
    returns: ObjectType.instance
  });
  return MutableFunctionTable.fromFunctionType(ftype);
}

const builtinTypes = memoize((): Readonly<ObjectType[]> => [
  IntegerType.instance(),
  ConstantStringType.instance()
]);

const referenceTypeDefaults = memoize((): ObjectType => freeze({
  name: (): string => raise('name me'),
  lookUp(_0: string): FunctionLookUpTable | undefined
    { raise('overwrite me'); },
  detuplify: () => undefined,
  // NOTE: Just a pointer for the reference type.
  sizeInBytes: () => WasmCompilation.kWordSizeInBytes,
  sizeInStackItems: () => 1,
  uid: () => raise('overwrite me'),
  type: () => 'object-type'
  // visit: <T>(_0: MelodyComponentVisitor<T>) =>
  //   raise('overwrite me')
}));

function make(mFrameName: string = 'ContextType'): ContextBaseStage_ {
  const mTable: FunctionOpLookUp = {};
  const { fromFunctionType } = MutableFunctionTable;

  const referenceGetter = ((): FunctionType => 
    FunctionTypeBase.make(undefined, undefined, writableReferenceType()));

  function addTypeAccessor(type: ObjectType): FunctionLookUpTable {
    const { mapToFringeAccessor } = FunctionNamingSchema;
    return mTable[mapToFringeAccessor(type.name())] = typeGetterOf(type);
  }

  const addSystem = ((): FunctionLookUpTable =>
    mTable[BuiltinFunctionNames.kSystemIoTable] =
      fromFunctionType(SystemIoType.selfGetter()));

  const addTuple = ((): FunctionLookUpTable =>
    mTable[TupleObjectType.kBaseName] =
      TupleObjectType.selfCallAsFunctionType());

  const addContext = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.kContextName] =
      fromFunctionType(referenceGetter()));

  const addNone = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.kNoneName] =
      fromFunctionType(FunctionTypeBase.emitEmptyTuple()));

  const writableReferenceType = memoize((): WritableObjectType =>
    addSystem() &&
    addContext() &&
    addNone() &&
    addTuple() &&
    (builtinTypes().every(addTypeAccessor) as true) &&
    WritableObjectType.make(mTable, freeze({
      ...referenceTypeDefaults(),
      name: () => mFrameName,
    })));

  // const referenceType = writableReferenceType as () => ObjectType;

  // function typingStage
  //   (contextNames: UsedContextNames,
  //    usedAncestors: UsedAncestorCollection,
  //    associations: FunctionTypeAssociationSet): ContextTypingStage_
  // {
  //   return ContextTypingStage_.
  //     make(contextNames, writableReferenceType(), usedAncestors, associations);
  // }

  return freeze({
    writableReferenceType
  });
}

/// A ContextBaseCreation is the first, prototype stage for creating a stack
/// frame's reference type.
export const ContextBaseStage_ = freeze({ make });
