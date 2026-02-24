import { CodeWriter } from '../../code_writer';
import { Helpers } from '../../helpers';
import { WasmFunctionBody } from '../wasm_function_body';

const { freeze } = Helpers;

function make
  (mFunctionBody: WasmFunctionBody,
   mGetInst: () => CodeWriter)
{
  return freeze({
    addIntegers(): CodeWriter {
      mFunctionBody.pushI32Add();
      return mGetInst();
    },
    multiplyIntegers(): CodeWriter {
      mFunctionBody.pushI32Multiply();
      return mGetInst();
    },
    subtractIntegers(): CodeWriter {
      mFunctionBody.pushI32Subtract();
      return mGetInst();
    },
    loadInteger(): CodeWriter {
      mFunctionBody.pushI32Load();
      return mGetInst();
    },
    pushInteger(num: number): CodeWriter {
      mFunctionBody.pushI32Const(num);
      return mGetInst();
    },
    storeInteger(): CodeWriter {
      mFunctionBody.pushI32Store();
      return mGetInst();
    }
  });
}

export const MemoryAluWriter = freeze({ make });
