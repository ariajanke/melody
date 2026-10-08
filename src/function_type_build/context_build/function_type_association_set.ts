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
import {
  CodeEmission,
  FunctionType,
  FunctionTypeAssociation,
  ImmediateFunction,
  ImmediateValue,
  MelodyComponent,
  MelodyComponentVisitor,
  ObjectType, 
  RuntimeOnlyValue
} from '../../melody_components';
import { TupleObjectType } from '../tuple_object_type';

export interface FunctionTypeAssociationSet {
  makeUnassociated
    (receiver?: ObjectType, parameters?: ObjectType, returns?: ObjectType)
    : FunctionType;
  associate(to: FunctionType, component: MelodyComponent): this;
};

type ImmType = ReturnType<FunctionTypeAssociation['immediate']>;

type EType = ReturnType<FunctionTypeAssociation['emission']>;

const { freeze } = Helpers;
const singleToUndefined = <T>(_0: T) => undefined;
const singleToSelf = <T>(t: T) => t;
const mImmediateVisitor: MelodyComponentVisitor<ImmType> = freeze({
  visitFunctionType: singleToUndefined<FunctionType>,
  visitCodeEmission: singleToUndefined<CodeEmission>,
  visitObjectType: singleToUndefined<ObjectType>,
  visitImmediateValue: singleToSelf<ImmediateValue>,
  visitImmediateFunction: singleToSelf<ImmediateFunction>,
  visitRuntimeOnly: singleToSelf<RuntimeOnlyValue>
});

const mEmissionVisitor: MelodyComponentVisitor<EType> = freeze({
  visitFunctionType: singleToUndefined<FunctionType>,
  visitCodeEmission: singleToSelf<CodeEmission>,
  visitObjectType: singleToUndefined<ObjectType>,
  visitImmediateValue: singleToUndefined<ImmediateValue>,
  visitImmediateFunction: singleToUndefined<ImmediateFunction>,
  visitRuntimeOnly: singleToUndefined<RuntimeOnlyValue>
});

function make(): FunctionTypeAssociationSet {
  const mEmissionCache: { [uid: symbol]: EType } = {};
  const mImmediateCache: { [uid: symbol]: ImmType } = {};
  const { emptyTuple } = TupleObjectType;
  function makeUnassociated
    (receiver?: ObjectType, parameters?: ObjectType, returns?: ObjectType)
    : FunctionType
  {
    const uid = Symbol();
    const ftype: FunctionType = freeze({
      receiver: receiver ? () => receiver : emptyTuple,
      parameters: parameters ? () => parameters : emptyTuple,
      returns: returns ? () => returns : emptyTuple,
      visit<T>(visitor: MelodyComponentVisitor<T>): T
        { return visitor.visitFunctionType(ftype); },
      uid: () => uid,
      emission: () => mEmissionCache[uid],
      immediate: () => mImmediateCache[uid]
    });
    return ftype;
  }
  function associate(to: FunctionType, component: MelodyComponent): FunctionTypeAssociationSet {
    const uid = to.uid();
    const emission = component.visit(mEmissionVisitor);
    if (emission) {
      mEmissionCache[uid] && raise('cannot set emission, already present');
      mEmissionCache[uid] = emission;
    }
    const immediate = component.visit(mImmediateVisitor);
    if (immediate) {
      mImmediateCache[uid] && raise('cannot set immediate, already present');
      mImmediateCache[uid] = immediate;
    }

    return inst;
  }
  const inst = freeze({
    makeUnassociated,
    associate
  });
  return inst;
}

export const FunctionTypeAssociationSet = freeze({ make });
