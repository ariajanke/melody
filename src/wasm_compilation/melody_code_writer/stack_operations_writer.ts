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
import { Helpers } from '../../helpers';
import { WasmFunctionBody } from '../wasm_function_body';
import { WasmFunctionLocalAllocation } from './wasm_function_locals_allocation';

const { freeze } = Helpers;

function make
  (mFunctionBody: WasmFunctionBody,
   mLocalAllocations: WasmFunctionLocalAllocation,
   mGetInst: () => CodeWriter)
{
  const { swapA, swapB } = mLocalAllocations;
  return freeze({
    drop(): CodeWriter {
      mFunctionBody.pushDrop();
      return mGetInst();
    },
    duplicateTop(): CodeWriter {
      mFunctionBody.
        pushTeeLocal(swapA()).
        getLocal(swapA());
      return mGetInst();
    },
    swapTopTwo(): CodeWriter {
      mFunctionBody.
        setLocal(swapA()).
        setLocal(swapB()).
        getLocal(swapA()).
        getLocal(swapB());
      return mGetInst();
    }
  });
}

export const StackOperationsWriter = freeze({ make });
