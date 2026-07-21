import { CodeWriter } from '../code_writer';
import { FunctionType } from '../function_type_build';
import { Helpers } from '../helpers';
import { BuiltinsWriter } from './melody_code_writer/builtins_writer';
import { FunctionCallWriter } from './melody_code_writer/function_call_writer';
import { MemoryAluWriter } from './melody_code_writer/memory_alu_writer';
import { StackOperationsWriter } from './melody_code_writer/stack_operations_writer';
import { StackPointerWriter } from './melody_code_writer/stack_pointer_writer';
import { StringLiteralWriter } from './melody_code_writer/string_literal_writer';
import { WasmFunctionLocalAllocation } from './melody_code_writer/wasm_function_locals_allocation';
import { WasmFunctionBody } from './wasm_function_body';

const { freeze } = Helpers;

function make
  (mFunctionToBuild: FunctionType,
   mSignatureIndexFor: (ftype: FunctionType) => number,
   mByteCodeEmitter: WasmFunctionBody): CodeWriter
{
  const mLocalAllocations = WasmFunctionLocalAllocation.make(mFunctionToBuild);
  const mGetInst = () => inst;
  const inst = freeze({
    ...BuiltinsWriter.make(mByteCodeEmitter, mGetInst),
    ...FunctionCallWriter.make(mByteCodeEmitter, mGetInst),
    ...MemoryAluWriter.make(mByteCodeEmitter, mGetInst),
    ...StackOperationsWriter.make(mByteCodeEmitter, mLocalAllocations, mGetInst),
    ...StackPointerWriter.make(mByteCodeEmitter, mLocalAllocations, mGetInst),
    ...StringLiteralWriter.make(mGetInst),

  }) satisfies CodeWriter;
  return inst;
}

const { assertFtypeSignatureOkay } = WasmFunctionLocalAllocation;

export const MelodyCodeWriter = freeze({ make, assertFtypeSignatureOkay });
