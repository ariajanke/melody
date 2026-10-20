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
import { Helpers, StandardErrorMessage } from './helpers'

const { freeze, memoize } = Helpers;

export interface StringToComponentTypeMap {
  'object-type': ObjectType;
  'code-emission': CodeEmission;
  'runtime-only-value': RuntimeOnlyValue;
  'immediate-value': ImmediateValue;
  'error': NodeError;
};

type Functionalized<T> = {
  [K in keyof T]: () => T[K] | undefined;
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
  functionalizedFrom(mSet: Partial<Functionalized<StringToComponentTypeMap>>): ConstantEntity {
    function get<KeyType extends MelodyComponentTypeString>
      (key: KeyType): StringToComponentTypeMap[KeyType] | undefined
    {
      const fn = mSet[key];
      return fn && fn();
    }

    return freeze({ get });
  },
  constFrom(mSet: Partial<StringToComponentTypeMap>): ConstantEntity {
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

export interface MelodyRelation {
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
  immediate(): ImmediateValue | RuntimeOnlyValue | undefined;
  immediateCallable(): ImmediateFunction | undefined;
};

export interface FunctionType extends MelodyRelation, FunctionTypeAssociation {
  receiver(): ObjectType;
  parameters(): ObjectType;
  returns(): ObjectType;
};

export interface NodeError extends MelodyComponent {
  error(): StandardErrorMessage;
};

export const NodeError = freeze({
  from(memoizedErrorFn: () => StandardErrorMessage | undefined): () => NodeError | undefined {
    return memoize((): NodeError | undefined => {
      if (memoizedErrorFn() === undefined) 
        { return undefined; }

      return freeze({
        type: () => 'error',
        uid: memoize(Symbol),
        error: memoizedErrorFn as () => StandardErrorMessage
      });
    });
  }
});

export interface CodeEmission extends MelodyComponent {
  emit(writer: CodeWriter, ctx: EmissionContext): void;
};

export interface ObjectType extends MelodyComponent {
  /// Display name only, no semantic use.
  name(): string;

  lookUp(fname: string): FunctionLookUpTable | undefined;

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

export interface FunctionLookUpTable extends MelodyRelation {
  byParameters(type: ObjectType): FunctionType | undefined;
  uniqueFunctionType(): FunctionType | undefined;
};

export interface RuntimeOnlyValue extends MelodyComponent {};

export const RuntimeOnlyValue = freeze({
  instance: memoize((): RuntimeOnlyValue => freeze({
    uid: memoize(Symbol),
    type: () => 'runtime-only-value'
  }))
});

export interface ImmediateValue extends MelodyComponent {
  asInteger(): number | undefined;
  asString(): string | undefined;
  asObjectType(): ObjectType | undefined;
};

export interface ImmediateFunction extends MelodyRelation {
  call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue;
};
