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

import { Helpers } from '../helpers';
import { FunctionLookUpTable, ObjectType } from '../function_type_build';

const { freeze, memoize } = Helpers;

type TupleLookUpTableEntry = {
  object: ObjectType;
  [uid: symbol]: TupleLookUpTableEntry | undefined;
};

const emptyLookUp =
  (_0: string | symbol): FunctionLookUpTable | undefined => undefined;

const makeInstance =
  (name: string, types: Readonly<ObjectType[]>): ObjectType =>
{
  const tallyUp = (sizeFn: (type: ObjectType) => number): number =>
    types.reduce((acc: number, type: ObjectType) => acc + sizeFn(type), 0);
  return freeze({
    name: () => name,
    lookUp: emptyLookUp,
    detuplify: (): Readonly<ObjectType[]> => types,
    uid: memoize(Symbol),
    sizeInBytes: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInBytes())),
    sizeInStackItems: memoize(() =>
      tallyUp((type: ObjectType) => type.sizeInStackItems()))
  });
};

const sTable: TupleLookUpTableEntry = { object: makeInstance('Tuple()', []) };

const emptyTuple = memoize((): ObjectType => instanceFor([]));

function instanceFor(types: Readonly<ObjectType[]>) {
  // NOTE by definition, a tuple of a single type is that type
  if (types.length === 1) {
    return types[0];
  }
  
  let seekingOn = sTable;
  let tupleName = 'Tuple(';
  types.forEach((type: ObjectType, idx: number) => {
    tupleName += type.name();
    seekingOn = seekingOn[type.uid()] ??=
      { object: makeInstance(`${tupleName})`, types.slice(0, idx + 1)) };
    tupleName += ', ';
  });
  return seekingOn.object;
}

export const TupleObjectType = freeze({ emptyTuple, instanceFor });
