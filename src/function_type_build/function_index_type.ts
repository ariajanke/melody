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

import { CodeWriter } from '../code_writer';
import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { WasmCompilation } from '../wasm_compilation';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

export interface FunctionIndexType {
  functionIndexType(): ObjectType;
  representativeFunctionType(): FunctionType;
};

const sInsts: { [parentUid: symbol]: FunctionIndexType | undefined } = {};

function makeNew(parent: ObjectType): FunctionIndexType {
  const { emptyTuple } = TupleObjectType;
  const representativeFunctionType = memoize((): FunctionType => freeze({
    parameters: emptyTuple,
    returns: emptyTuple,
    receiver: () => parent,
    simpleEmit(_0: CodeWriter)
      { raise('not emittable'); },
    emit(_0: FunctionType,
          _1: FunctionType,
          _2: CodeWriter)
      { raise('not emittable'); },
    uid: memoize(Symbol)
  }));
  const lookUpTable = memoize(() =>
    MutableFunctionTable.fromFunctionType(representativeFunctionType()));
  const functionIndexType = memoize((): ObjectType => freeze({
    name: memoize(() => `${parent.name()}.Function()()`),
    lookUp(operation: string | symbol): FunctionLookUpTable | undefined {
      if (operation !== OperatorNamingSchema.kCall)
        { return undefined; }
      return lookUpTable();
    },
    detuplify: () => undefined,
    uid: memoize(Symbol),
    sizeInBytes: () => WasmCompilation.kWordSizeInBytes,
    sizeInStackItems: () => 1
  }));

  return freeze({
    functionIndexType,
    representativeFunctionType
  });
}

function make(parent: ObjectType): FunctionIndexType {
  return sInsts[parent.uid()] ??= makeNew(parent);
}

export const FunctionIndexType = freeze({ of: make });
