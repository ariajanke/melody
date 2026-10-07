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

import { AstNode } from './ast_node';
import { Helpers } from './helpers';
import { CodeWriter } from './code_writer';

// TODO clean up this import
import { TupleObjectType } from './function_type_build/tuple_object_type';

const { freeze } = Helpers;

export interface MelodyComponent {
  // differentiate records this way
  visit<T>(visitor: MelodyComponentVisitor<T>): T;
  uid(): symbol;
};

export interface MelodyComponentVisitor<T> {
  visitFunctionType(ftype: FunctionType): T;
  visitCodeEmission(cem: CodeEmission): T;
  visitObjectType(otype: ObjectType): T;
  visitImmediateValue(imm: ImmediateValue): T;
  visitImmediateFunction(imf: ImmediateFunction): T;
};

// TODO OOS for this file
export interface EmissionContext {
  pushParameters(obj: ObjectType, em: CodeEmission): void;
  pushReceiver(obj: ObjectType, em: CodeEmission): void;
  popParameters(obj: ObjectType): CodeEmission;
  popReceiver(obj: ObjectType): CodeEmission;
};

export interface FunctionType extends MelodyComponent {
  parameters(): ObjectType;
  returns(): ObjectType;
  receiver(): ObjectType;
};

export interface FunctionTypeRelationSet {
  emission(): CodeEmission | undefined;
  immediate(): ImmediateFunction | ImmediateValue | RuntimeOnlyValue | undefined;
};

export interface CodeEmission extends MelodyComponent {
  emit(writer: CodeWriter, ctx: EmissionContext): void;
};

export interface ObjectType extends MelodyComponent {
  /// Display name only, no semantic use.
  name(): string;

  lookUp(operation: string): FunctionLookUpTable | undefined;

  /// If this is a tuple, it maybe "detuplified". By definition there are no
  /// single member tuples.
  detuplify(): Readonly<ObjectType[]> | undefined;

  sizeInBytes(): number;
  sizeInStackItems(): number;
};

export interface FunctionLookUpTable {
  byParameters(type: ObjectType): FunctionType | undefined;
  uniqueFunctionType(): FunctionType | undefined;
};

export interface RuntimeOnlyValue extends MelodyComponent {};

export interface ImmediateValue extends MelodyComponent {
  asInteger(): number | undefined;
  asObjectType(): ObjectType | undefined;
};

export interface NodeRelationSet {
  emission(): CodeEmission | undefined;
  objectType(): ObjectType;
  immediateValue(): ImmediateValue | undefined;
};

// interface MelodyDatabase {
//   retrieveForNode(node: AstNode): NodeRelationSet;
//   retrieveForFunction(ftype: FunctionType): FunctionTypeRelationSet;
// };

// interface MelodyWritableDatabase extends MelodyDatabase {
//   // differentiate the type, record to the correct "table",
//   // and raise if the wrong type is passed
//   writeForNode(node: AstNode, record: MelodyComponent): void;
//   writeForFunction(ftype: FunctionType, component: MelodyComponent): void;
// }

export interface ImmediateFunction extends MelodyComponent {
  call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue;
};

// interface FunctionRegistry {
//   register(ftype: FunctionType, completedContextType: ObjectType): void;
// };
