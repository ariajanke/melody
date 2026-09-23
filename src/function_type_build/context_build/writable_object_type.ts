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

import { FunctionLookUpTable, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { BuiltinTypeBase } from '../builtin_type_base';

const { freeze } = Helpers;

export type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

export interface WritableObjectType extends ObjectType {
  // not sure I can enfore move semantic like handling
  setFunctionLookUp
    (operation: string | symbol, lookUpTbl: FunctionLookUpTable)
    : WritableObjectType;
  peek(): WritableObjectType;
};

function make
  (mTable: FunctionOpLookUp = {},
   mBaseObjectType: ObjectType = BuiltinTypeBase.makeNewWithDefaults())
  : WritableObjectType
{
  function setFunctionLookUp
    (operation: string | symbol, lookUpTbl: FunctionLookUpTable)
    : WritableObjectType
  {
    if (mTable[operation]) {
      raise(`Already used '${String(operation)}'`);
    }

    mTable[operation] = lookUpTbl;
    return inst;
  }

  const { lookUp } = mBaseObjectType;

  const inst = freeze({
    ...mBaseObjectType,
    lookUp(operation: string | symbol): FunctionLookUpTable | undefined
      { return mTable[operation] ?? lookUp(operation); },
    setFunctionLookUp,
    peek() {
      return inst;
    }
  });
  return inst;
}

export const WritableObjectType = freeze({ make });
