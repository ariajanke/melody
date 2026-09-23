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

import { CodeWriter } from '../../code_writer';
import { Helpers, raise } from '../../helpers';
import { WasmBuiltinImportsCreation } from '../wasm_builtin_imports_creation';
import { WasmFunctionBody } from '../wasm_function_body';

const { freeze } = Helpers;

function make
  (mFunctionBody: WasmFunctionBody,
   mGetInst: () => CodeWriter)
{
  const getImportFuncIndex = (name: string) => {
    const { descriptions } = WasmBuiltinImportsCreation;
    const desc = descriptions()[name];
    if (!desc) { 
      raise(`"${name}" is mispelled or does not exist`);
    }
    return desc.index;
  };

  const makeFunctionCall = (name: string) =>
    () => {
      const idx = getImportFuncIndex(name);
      mFunctionBody = mFunctionBody.pushFunctionCall(idx);
      return mGetInst();
    };

  return freeze({
    askInteger: makeFunctionCall('askInteger'),
    askString: makeFunctionCall('askString'),
    printInteger: makeFunctionCall('printInteger'),
    printString: makeFunctionCall('printString'),
  });
}

export const BuiltinsWriter = freeze({ make });
