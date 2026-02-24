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
