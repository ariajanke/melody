import { CodeWriter } from '../../code_writer';
import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { WasmFunctionBody } from '../wasm_function_body';
import { WasmFunctionRegistry } from '../wasm_function_registry';

const { freeze } = Helpers;

function make
  (mByteCodeEmitter: WasmFunctionBody,
   mGetInst: () => CodeWriter,
   mSignatureIndexFor: (ftype: FunctionType) => number)
{
  // NOTE strictly support only one signature: (i32) -> ()

  const mStackFrameSizes: number[] = [];
  const getTopSize = (): number =>
    mStackFrameSizes[mStackFrameSizes.length - 1] ??
    raise('uh oh!');
  
  return freeze({
    indirectCall(beingCalled: FunctionType): CodeWriter {
      WasmFunctionRegistry.assertFtypeSignatureOkay(beingCalled);
      mByteCodeEmitter.pushI32Const(getTopSize());
      mGetInst().pushStackPointer();
      mByteCodeEmitter.pushI32Add();
      mGetInst().setStackPointer();
      mByteCodeEmitter.callIndirect(mSignatureIndexFor(beingCalled));
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
