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
import { WasmFunctionBody } from '../wasm_function_body';
import { WasmGlobalsSection } from '../wasm_globals_section';
import { WasmFunctionLocalAllocation } from './wasm_function_locals_allocation';

const { freeze, memoize } = Helpers;

function make
  (mByteCodeEmitter: WasmFunctionBody,
   mLocalAllocations: WasmFunctionLocalAllocation,
   mGetInst: () => CodeWriter)
{
  // TODO reduce count to only the needed public methods
  const stackPointerLocation = memoize(() =>
    WasmGlobalsSection.kStackPointerLocation);

  const { localStackPointerIndex, receiverParameterIndex } = mLocalAllocations;

  return freeze({
    saveStackPointerToLocal(): CodeWriter {
      mByteCodeEmitter.
        getGlobal(stackPointerLocation()).
        setLocal(localStackPointerIndex());
      return mGetInst();
    },
    restoreStackPointerToGlobal(): CodeWriter {
      mByteCodeEmitter.
        getLocal(localStackPointerIndex()).
        setGlobal(stackPointerLocation());
      return mGetInst();
    },
    storeParentPointer(accessIndex: number): CodeWriter {
      if (accessIndex !== 0) {
        raise(`need to rewrite this function for a different access index (${accessIndex})`);
      }
      mByteCodeEmitter.
        getGlobal(stackPointerLocation()).
        getLocal(receiverParameterIndex()).
        pushI32Store();
      return mGetInst();
    },
    setStackPointer(): CodeWriter {
      mByteCodeEmitter.setGlobal(stackPointerLocation());
      return mGetInst();
    },
    pushStackPointer(): CodeWriter {
      mByteCodeEmitter.getGlobal(stackPointerLocation());
      return mGetInst();
    }
  });
}

export const StackPointerWriter = freeze({ make });
