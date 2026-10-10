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
import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, raise } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { ContextLinkStage_ } from './context_link_stage';
import { BuiltinTypeBase } from '../builtin_type_base';
import { FunctionOpLookUp, WritableObjectType } from './writable_object_type';
import { WasmCompilation } from '../../wasm_compilation';
import { SystemIoType } from '../system_io_type';
import { PutsFunctionLookUpTable } from '../puts_function_look_up_table';
import { FunctionLookUpTable, FunctionType, MelodyComponentVisitor, ObjectType } from '../../melody_components';
import { TupleObjectType } from '../tuple_object_type';
import { IntegerType } from '../integer_type';

const { freeze, memoize } = Helpers;

export interface ContextBaseStage_ {
  referenceType(): ObjectType;
  contextLinkStage(mPendingNames: Readonly<{ [name: string]: true }>,
                   mFrameStack: ContextFrameStack)
    : ContextLinkStage_;
};

function make(mFrameName: string = 'ContextType'): ContextBaseStage_ {
  const mTable: FunctionOpLookUp = {};
  const { fromFunctionType } = MutableFunctionTable;

  const referenceGetter = ((): FunctionType => 
    FunctionTypeBase.make(undefined, undefined, writableReferenceType()));

  const addSystem = ((): FunctionLookUpTable =>
    mTable[BuiltinFunctionNames.kSystemIoTable] =
      fromFunctionType(SystemIoType.selfGetter()));

  // const addPuts  = ((): FunctionLookUpTable =>
  //   mTable[BuiltinFunctionNames.kPuts] = PutsFunctionLookUpTable.instance());

  // new builtins, they are immediately evaluable!
  'ConstantString'
  const addInteger = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.mapToFringeAccessor(IntegerType.instance().name())] =
      fromFunctionType(IntegerType.objectTypeGetter()));

  const addTuple = ((): FunctionLookUpTable =>
    mTable[TupleObjectType.kBaseName] =
      TupleObjectType.selfCallAsFunctionType());

  const addContext = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.kContextName] =
      fromFunctionType(referenceGetter()));

  // TODO might be unused
  const addNone = ((): FunctionLookUpTable =>
    mTable[FunctionNamingSchema.kNoneName] =
      fromFunctionType(FunctionTypeBase.emitEmptyTuple()));

  const writableReferenceType = memoize((): WritableObjectType =>
    addSystem() &&
    addContext() &&
    addNone() &&
    // addPuts() &&
    WritableObjectType.make(mTable, freeze({
      ...BuiltinTypeBase.makeNewWithDefaults(),
      name: () => mFrameName,
      // NOTE: Just a pointer for the reference type.
      sizeInBytes: () => WasmCompilation.kWordSizeInBytes,
      sizeInStackItems: () => 1
    })));

  const referenceType = writableReferenceType as () => ObjectType;

  function contextLinkStage
    (mPendingNames: Readonly<{ [name: string]: true }>,
     mFrameStack: ContextFrameStack)
  {
    return ContextLinkStage_.
      make( mPendingNames, mFrameStack, writableReferenceType() );
  }

  return freeze({
    referenceType,
    contextLinkStage
  });
}

/// A ContextBaseCreation is the first, prototype stage for creating a stack
/// frame's reference type.
export const ContextBaseStage_ = freeze({ make });
