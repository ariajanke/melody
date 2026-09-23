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

import { FunctionType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { WasmFunctionRegistry } from '../wasm_function_registry';

const { freeze, memoize, makeCounter } = Helpers;
const { assertFtypeSignatureOkay } = WasmFunctionRegistry;

export interface WasmFunctionLocalAllocation {
  receiverParameterIndex(): number;
  swapA(): number;
  swapB(): number;
  localStackPointerIndex(): number;
  totalLocalCount(): number;
}

function make(mFunctionToBuild: FunctionType): WasmFunctionLocalAllocation {
  assertFtypeSignatureOkay(mFunctionToBuild);
  let mLastLocal = 0;
  const counter = makeCounter();
  const kParentPointerParamIndex = mLastLocal = counter();
  
  return freeze({
    receiverParameterIndex: () => kParentPointerParamIndex,
    swapA: memoize(() => mLastLocal = counter()),
    swapB: memoize(() => mLastLocal = counter()),
    localStackPointerIndex: memoize(() => mLastLocal = counter()),
    totalLocalCount: () => mLastLocal + 1
  });
}

export const WasmFunctionLocalAllocation = freeze({ make });
