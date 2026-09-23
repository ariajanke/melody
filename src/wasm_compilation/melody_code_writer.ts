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

import { CodeWriter } from '../code_writer';
import { FunctionType } from '../function_type_build';
import { Helpers } from '../helpers';
import { StringPool } from './string_pool';
import { WasmCodeSection } from './wasm_code_section';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmFunctionRegistry } from './wasm_function_registry';

import { BuiltinsWriter } from './melody_code_writer/builtins_writer';
import { FunctionCallWriter } from './melody_code_writer/function_call_writer';
import { MemoryAluWriter } from './melody_code_writer/memory_alu_writer';
import { StackOperationsWriter } from './melody_code_writer/stack_operations_writer';
import { StackPointerWriter } from './melody_code_writer/stack_pointer_writer';
import { WasmFunctionLocalAllocation } from './melody_code_writer/wasm_function_locals_allocation';

const { freeze } = Helpers;

export interface MelodyCodeWriter extends CodeWriter {
  appendByteCodeTo(codeSection: WasmCodeSection): void;
};

function make
  (mFunctionToBuild: FunctionType,
   mStringPool: StringPool,
   mFunctionRegistry: WasmFunctionRegistry)
  : MelodyCodeWriter
{
  const mByteCodeEmitter = WasmFunctionBody.make();
  const mLocalAllocations = WasmFunctionLocalAllocation.make(mFunctionToBuild);
  const mGetInst = () => inst;
  function appendByteCodeTo(codeSection: WasmCodeSection): void {
    
    codeSection.pushFunctionBody( mByteCodeEmitter.
      setLocalCount(mLocalAllocations).
        finish() );
  }

  const inst = freeze({
    ...BuiltinsWriter.make(mByteCodeEmitter, mGetInst),
    ...FunctionCallWriter.make(mByteCodeEmitter, mGetInst, mFunctionRegistry),
    ...MemoryAluWriter.make(mByteCodeEmitter, mGetInst),
    ...StackOperationsWriter.make(mByteCodeEmitter, mLocalAllocations, mGetInst),
    ...StackPointerWriter.make(mByteCodeEmitter, mLocalAllocations, mGetInst),
    ...mStringPool.makeLiteralWriter(mGetInst),
    appendByteCodeTo
  });

  return inst;
}

export const MelodyCodeWriter = freeze({ make });
