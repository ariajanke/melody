import { CodeWriter } from '../../code_writer';
import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { WasmFunctionBody } from '../wasm_function_body';
import { WasmFunctionLocalAllocation } from './wasm_function_locals_allocation';

const { freeze } = Helpers;

function make
  (mByteCodeEmitter: WasmFunctionBody,
   mGetInst: () => CodeWriter)
{
  // NOTE strictly support only one signature: (i32) -> ()
  const kSignatureIndex = 0;

  const mStackFrameSizes: number[] = [];
  const getTopSize = (): number =>
    mStackFrameSizes[mStackFrameSizes.length - 1] ??
    raise('uh oh!');
  
  return freeze({
    indirectCall(beingCalled: FunctionType): CodeWriter {
      WasmFunctionLocalAllocation.assertFtypeSignatureOkay(beingCalled);
      mByteCodeEmitter.pushI32Const(getTopSize());
      mGetInst().pushStackPointer();
      mByteCodeEmitter.pushI32Add();
      mGetInst().setStackPointer();
      mByteCodeEmitter.callIndirect(kSignatureIndex);
      return mGetInst().restoreStackPointerToGlobal();
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
