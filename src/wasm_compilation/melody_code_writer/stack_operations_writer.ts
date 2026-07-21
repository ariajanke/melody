import { CodeWriter } from '../../code_writer';
import { Helpers } from '../../helpers';
import { WasmFunctionBody } from '../wasm_function_body';
import { WasmFunctionLocalAllocation } from './wasm_function_locals_allocation';

const { freeze } = Helpers;

function make
  (mFunctionBody: WasmFunctionBody,
   mLocalAllocations: WasmFunctionLocalAllocation,
   mGetInst: () => CodeWriter)
{
  const { swapA, swapB } = mLocalAllocations;
  return freeze({
    drop(): CodeWriter {
      mFunctionBody.pushDrop();
      return mGetInst();
    },
    duplicateTop(): CodeWriter {
      mFunctionBody.
        pushTeeLocal(swapA()).
        getLocal(swapA());
      return mGetInst();
    },
    swapTopTwo(): CodeWriter {
      mFunctionBody.
        setLocal(swapA()).
        setLocal(swapB()).
        getLocal(swapA()).
        getLocal(swapB());
      return mGetInst();
    }
  });
}

export const StackOperationsWriter = freeze({ make });
