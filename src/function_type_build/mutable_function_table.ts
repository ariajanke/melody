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

import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

export interface MutableFunctionTable extends FunctionLookUpTable {
  setDefinition(ft: FunctionType): MutableFunctionTable;
};

function make(): MutableFunctionTable {
  const mMappings: { [uid: symbol]: FunctionType | undefined } = {};
  let mCount = 0;
  let mUnique: FunctionType | undefined = undefined;

  function setDefinition(ft: FunctionType): MutableFunctionTable {
    const uid = ft.parameters().uid();
    if (mMappings[uid]) {
      raise(`Parameter type "${ft.parameters().name()}" already taken`);
    }
    mMappings[uid] = ft;
    ++mCount;
    if (mCount === 1) {
      mUnique = ft;
    } else {
      mUnique = undefined;
    }
    return inst;
  }

  const inst = freeze({
    setDefinition,
    uniqueFunctionType: (): FunctionType | undefined => mUnique,
    byParameters: (type: ObjectType) => mMappings[type.uid()]
  });
  return inst;
}

function fromFunctionType(ftype: FunctionType): FunctionLookUpTable {
  return freeze({
    byParameters: (type: ObjectType) => (type.uid() == ftype.parameters().uid()) ? ftype : undefined,
    uniqueFunctionType: (): FunctionType | undefined => ftype
  });
}

const emitEmptyTuple = memoize((): FunctionLookUpTable =>
  fromFunctionType(FunctionTypeBase.emitEmptyTuple()));

export const MutableFunctionTable = freeze({
  make,
  fromFunctionType,
  emitEmptyTuple
});
