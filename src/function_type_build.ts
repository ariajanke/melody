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

import { CodeWriter } from './code_writer';
import { FunctionDefinitionRegistry } from './function_definition_registry';
import { FunctionTypeBase } from './function_type_build/function_type_base';
import { FunctionTypeBuildVisitor } from './function_type_build/function_type_build_visitor';
import { TupleObjectType } from './function_type_build/tuple_object_type';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstNode } from './ast_node';

const { freeze, memoize } = Helpers;

export interface FunctionType {
  parameters(): ObjectType;
  returns(): ObjectType;
  receiver(): ObjectType;

  // simpleEmit(writer: CodeWriter): void;

  // emit(receiverFtype: FunctionType,
  //      parameterFtype: FunctionType,
  //      writer: CodeWriter): void;

  uid(): symbol;
};

export interface EmissionContext {
  pushParameters(em: CodeEmission): void;
  pushReceiver(em: CodeEmission): void;
  popParameters(): CodeEmission;
  popReceiver(): CodeEmission;
};

export interface CodeEmission {
  emit(writer: CodeWriter, ctx: EmissionContext): void;
};

export const FunctionType = FunctionTypeBase;

export interface ObjectType {
  /// Display name only, no semantic use.
  name(): string;

  lookUp(operation: string | symbol): FunctionLookUpTable | undefined;

  /// If this is a tuple, it maybe "detuplified". By definition there are no
  /// single member tuples.
  detuplify(): Readonly<ObjectType[]> | undefined;
  uid(): symbol;

  sizeInBytes(): number;
  sizeInStackItems(): number;
};

export interface MutableObjectType extends ObjectType {
  setLookUp(operation: string | symbol, lookUpTable: FunctionLookUpTable): void;
};

export interface FunctionLookUpTable {
  byParameters(type: ObjectType): FunctionType | undefined;
  uniqueFunctionType(): FunctionType | undefined;
};

export interface FunctionTypeBuild {
  functionType(): FunctionType | undefined,
  error(): StandardErrorMessage
};

export interface ImmediateValue {
  asInteger(): number | undefined;
  asObjectType(): ObjectType | undefined;
};

interface ImmediateFunction {
  call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue;
};

interface FunctionRegistry {
  register(ftype: FunctionType, completedContextType: ObjectType): void;
};

function make(mRoot: AstNode,
              mFunctionRegistry?: FunctionDefinitionRegistry)
  : FunctionTypeBuild
{
  mFunctionRegistry ??= FunctionDefinitionRegistry.make();
  const mVisitor = FunctionTypeBuildVisitor.make(mFunctionRegistry);
  const mBuild = memoize(() => mRoot.visit(mVisitor));

  return freeze({
    functionType: () => mBuild().functionType(),
    error: () => mBuild().error()
  });
}

export const FunctionTypeBuild = freeze({
  make,
  emptyTupleType: TupleObjectType.emptyTuple
});
