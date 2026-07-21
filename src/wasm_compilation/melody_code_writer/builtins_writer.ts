import { CodeWriter } from '../../code_writer';
import { Helpers, raise } from '../../helpers';
import { WasmBuiltinImportsCreation } from '../wasm_builtin_imports_creation';
import { WasmFunctionBody } from '../wasm_function_body';

const { freeze } = Helpers;

function make
  (mFunctionBody: WasmFunctionBody,
   mGetInst: () => CodeWriter)
{
  const getImportFuncIndex = (name: string) => {
    const { descriptions } = WasmBuiltinImportsCreation;
    const desc = descriptions()[name];
    if (!desc) { 
      raise(`"${name}" is mispelled or does not exist`);
    }
    return desc.index;
  };

  const makeFunctionCall = (name: string) =>
    () => {
      const idx = getImportFuncIndex(name);
      mFunctionBody = mFunctionBody.pushFunctionCall(idx);
      return mGetInst();
    };

  return freeze({
    askInteger: makeFunctionCall('askInteger'),
    askString: makeFunctionCall('askString'),
    printInteger: makeFunctionCall('printInteger'),
    printString: makeFunctionCall('printString'),
  });
}

export const BuiltinsWriter = freeze({ make });
