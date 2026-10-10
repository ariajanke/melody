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

import { Helpers, raise } from '../helpers';
import {
  FunctionLookUpTable,
  FunctionType,
  ImmediateFunction,
  ImmediateValue,
  MelodyComponentVisitor,
  ObjectType
} from '../melody_components';

const { freeze, memoize } = Helpers;

type TupleLookUpTableEntry = {
  object: ObjectType;
  [uid: symbol]: TupleLookUpTableEntry | undefined;
};

const emptyLookUp =
  (_0: string | symbol): FunctionLookUpTable | undefined => undefined;

const kBaseName = 'Tuple';

const makeInstance =
  (name: string, types: Readonly<ObjectType[]>): ObjectType =>
{
  const tallyUp = (sizeFn: (type: ObjectType) => number): number =>
    types.reduce((acc: number, type: ObjectType) => acc + sizeFn(type), 0);
  const inst: ObjectType = freeze({
    name: () => name,
    lookUp: emptyLookUp,
    detuplify: (): Readonly<ObjectType[]> => types,
    uid: memoize(Symbol),
    visit: <T>(visitor: MelodyComponentVisitor<T>) =>
      visitor.visitObjectType(inst),
    sizeInBytes: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInBytes())),
    sizeInStackItems: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInStackItems()))
  });
  return inst;
};

const sTypesToObject: TupleLookUpTableEntry = {
  object: makeInstance(`${kBaseName}()`, [])
};

const emptyTuple = memoize((): ObjectType => instanceFor([]));

const selfCallAsFunctionType = memoize((): FunctionLookUpTable => {
  const isSingularlyObjectType = (type: ObjectType) =>
    ObjectType.instance().uid() === type.uid();
  function isAllObjectType(type: ObjectType) {
    if (isSingularlyObjectType(type))
      { return true; }

    const detuped = type.detuplify();
    return detuped && detuped.every(isSingularlyObjectType);
  }

  function makeFtypeFor(type: ObjectType): FunctionType {
    const imf: ImmediateFunction = freeze({
      uid: memoize(Symbol),
      visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
        visitor.visitImmediateFunction(imf),
      call(_0: ImmediateValue, parameters: ImmediateValue): ImmediateValue {
        // TODO need to verify receiver
        // receiver.asObjectType() ?? raise('expected receiver to be an object type');
        parameters.asObjectType() ?? raise('expected parameters to be an object type');
        return parameters;
      }
    });

    const ftype = freeze({
      uid: memoize(Symbol),
      visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
        visitor.visitFunctionType(ftype),
      receiver: emptyTuple,
      parameters: () => type,
      returns: ObjectType.instance,
      emission: () => undefined,
      immediate: () => imf
    });
    return ftype;
  }

  const mParameterTypeToFunctionType: { [uid: symbol]: FunctionType | undefined } = {};

  const inst = freeze({
    byParameters(type: ObjectType): FunctionType | undefined {
      if (!isAllObjectType(type))
        { return undefined; }
      
      return mParameterTypeToFunctionType[type.uid()] ??= makeFtypeFor(type);
    },
    uniqueFunctionType: (): FunctionType | undefined => undefined
  });
  return inst;
});

function instanceFor(types: Readonly<ObjectType[]>) {
  // NOTE by definition, a tuple of a single type is that type
  if (types.length === 1) {
    return types[0];
  }
  
  let seekingOn = sTypesToObject;
  let tupleName = `${kBaseName}(`;
  types.forEach((type: ObjectType, idx: number) => {
    tupleName += type.name();
    seekingOn = seekingOn[type.uid()] ??=
      { object: makeInstance(`${tupleName})`, types.slice(0, idx + 1)) };
    tupleName += ', ';
  });
  return seekingOn.object;
}

export const TupleObjectType = freeze({
  emptyTuple,
  instanceFor,
  selfCallAsFunctionType,
  kBaseName
});
