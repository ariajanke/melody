import { FunctionType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { WasmFunctionRegistry } from '../wasm_function_registry';

const { freeze, memoize, makeCounter } = Helpers;
const { assertFtypeSignatureOkay } = WasmFunctionRegistry;

// it's so statey :/
export interface WasmFunctionLocalAllocation {
  receiverParameterIndex(): number;
  // swapTempIndex(): number;
  // I know, there's a better way to do this :/
  swapA(): number;
  swapB(): number;
  localStackPointerIndex(): number;
  totalLocalCount(): number;
}

function make(mFunctionToBuild: FunctionType): WasmFunctionLocalAllocation {
  assertFtypeSignatureOkay(mFunctionToBuild);
  let mLocalsCount = 0;
  const counter = makeCounter();
  const kParentPointerParamIndex = mLocalsCount = counter();
  
  return freeze({
    receiverParameterIndex: () => kParentPointerParamIndex,
    swapA: memoize(() => mLocalsCount = counter()),
    swapB: memoize(() => mLocalsCount = counter()),
    localStackPointerIndex: memoize(() => mLocalsCount = counter()),
    totalLocalCount: () => mLocalsCount
  });
}

export const WasmFunctionLocalAllocation = freeze({ make });
