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
import { Helpers } from './helpers'

const { freeze, memoize } = Helpers;

export interface StringToComponentTypeMap {
  'object-type': ObjectType;
  'code-emission': CodeEmission;
  'runtime-only-value': RuntimeOnlyValue;
  'function-type': FunctionType;
  'immediate-value': ImmediateValue;
};

export type MelodyComponentTypeString = keyof StringToComponentTypeMap;

export interface ConstantEntity {
  get<KeyType extends MelodyComponentTypeString>
    (key: KeyType): StringToComponentTypeMap[KeyType] | undefined;
};

export interface MelodyEntity extends ConstantEntity {
  set<KeyType extends MelodyComponentTypeString>
    (key: KeyType, value: StringToComponentTypeMap[KeyType])
    : StringToComponentTypeMap[KeyType];
};

export const MelodyEntity = freeze({
  constFrom(mSet: Partial<StringToComponentTypeMap>) {
    function get<KeyType extends MelodyComponentTypeString>
      (key: KeyType): StringToComponentTypeMap[KeyType] | undefined
    { return mSet[key]; }

    return freeze({ get });
  },
  make(): MelodyEntity {
    const mSet: Partial<StringToComponentTypeMap> = {};
    function get<KeyType extends MelodyComponentTypeString>
      (key: KeyType): StringToComponentTypeMap[KeyType] | undefined
    { return mSet[key]; }

    function set<KeyType extends MelodyComponentTypeString>
      (key: KeyType, value: StringToComponentTypeMap[KeyType])
      : StringToComponentTypeMap[KeyType]
    { return mSet[key] ??= value; }

    return freeze({ set, get });
  }
});

export interface MelodyComponent {
  type(): MelodyComponentTypeString;
  uid(): symbol;
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
  instance: memoize((): ObjectType => {
    const inst = freeze({
      uid: memoize(Symbol),
      name: (): string => 'ObjectType',
      type: () => 'object-type',
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

// export interface NodeRelationSet {
//   emission(): CodeEmission | undefined;
//   objectType(): ObjectType;
//   immediateValue(): ImmediateValue | undefined;
// };

export interface ImmediateFunction extends MelodyComponent {
  call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue;
};
