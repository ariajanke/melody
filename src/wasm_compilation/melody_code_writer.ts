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
    codeSection.pushFunctionBody( mByteCodeEmitter.finish() );
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
