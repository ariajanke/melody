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
import { Helpers } from './helpers';

const { freeze, memoize } = Helpers;

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
  visitRuntimeOnly(rto: RuntimeOnlyValue): T;
};

// TODO OOS for this file
export interface EmissionContext {
  pushParameters(obj: ObjectType, em: CodeEmission): void;
  pushReceiver(obj: ObjectType, em: CodeEmission): void;
  popParameters(obj: ObjectType): CodeEmission;
  popReceiver(obj: ObjectType): CodeEmission;
};

export interface FunctionTypeAssociation {
  emission(): CodeEmission | undefined;
  immediate(): ImmediateFunction | ImmediateValue | RuntimeOnlyValue | undefined;
};

export interface FunctionType extends MelodyComponent, FunctionTypeAssociation {
  receiver(): ObjectType;
  parameters(): ObjectType;
  returns(): ObjectType;
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

export const ObjectType = freeze({
  // ouch...
  // typeGetterOf(type: ObjectType): FunctionType {
  //   const immediateValue = freeze({
  //     asInteger: () => undefined,
  //     asObjectType: () => inst,
  //     uid: memoize(Symbol),
  //     visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
  //       visitor.visitImmediateValue(immediateValue),
  //   });
  //   const ftype = freeze({
  //     emission: () => undefined,
  //     immediate: () => immediateValue,
  //     uid: memoize(Symbol),
  //     visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
  //       visitor.visitFunctionType(ftype),
  //     receiver: TupleObjectType.emptyTuple,
  //     parameters: TupleObjectType.emptyTuple,
  //     returns: ObjectType.instance
  //   });
  //   return ftype;
  // },
  instance: memoize((): ObjectType => {
    const inst = freeze({
      uid: memoize(Symbol),
      name: (): string => 'ObjectType',
      visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
        visitor.visitObjectType(inst),
      lookUp: (_0: string): FunctionLookUpTable | undefined => undefined,
      detuplify: (): Readonly<ObjectType[]> | undefined => undefined,
      sizeInBytes: (): number => 0,
      sizeInStackItems: (): number => 0
    });
    return inst;
  })
});

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

export interface ImmediateFunction extends MelodyComponent {
  call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue;
};
