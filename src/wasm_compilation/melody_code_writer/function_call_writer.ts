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
  })
}

export const FunctionCallWriter = freeze({ make });
