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
import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { WasmFunctionBody } from '../wasm_function_body';
import { WasmFunctionRegistry } from '../wasm_function_registry';

const { freeze } = Helpers;

function make
  (mByteCodeEmitter: WasmFunctionBody,
   mGetInst: () => CodeWriter,
   mFunctionRegistry: WasmFunctionRegistry)
{
  const mStackFrameSizes: number[] = [];
  const getTopSize = (): number =>
    mStackFrameSizes[mStackFrameSizes.length - 1] ??
    raise('stack frame sizes stack is empty');

  const { signatureIndexFor, indexOfRegisteredFor } = mFunctionRegistry;
  
  return freeze({
    indirectCall(beingCalled: FunctionType): CodeWriter {
      WasmFunctionRegistry.assertFtypeSignatureOkay(beingCalled);
      mByteCodeEmitter.pushI32Const(getTopSize());
      mGetInst().pushStackPointer();
      mByteCodeEmitter.pushI32Add();
      mGetInst().setStackPointer();
      mByteCodeEmitter.callIndirect(signatureIndexFor(beingCalled));
      return mGetInst().restoreStackPointerToGlobal();
    },
    pushIndexOfRegistered(ftype: FunctionType): CodeWriter {
      const idx = indexOfRegisteredFor(ftype);
      mByteCodeEmitter.pushI32Const( idx );
      return mGetInst();
    },
    withStackFrameSize<T>(size: number, fn: (cw: CodeWriter) => T): T {
      mStackFrameSizes.push(size);
      const rv = fn(mGetInst());
      mStackFrameSizes.pop();
      return rv;
    }
  });
}

export const FunctionCallWriter = freeze({ make });
