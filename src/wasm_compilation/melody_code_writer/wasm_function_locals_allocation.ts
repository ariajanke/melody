import { FunctionType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { WasmFunctionRegistry } from '../wasm_function_registry';

const { freeze, memoize, makeCounter } = Helpers;
const { assertFtypeSignatureOkay } = WasmFunctionRegistry;

export interface WasmFunctionLocalAllocation {
  receiverParameterIndex(): number;
  swapA(): number;
  swapB(): number;
  localStackPointerIndex(): number;
  totalLocalCount(): number;
}

function make(mFunctionToBuild: FunctionType): WasmFunctionLocalAllocation {
  assertFtypeSignatureOkay(mFunctionToBuild);
  let mLastLocal = 0;
  const counter = makeCounter();
  const kParentPointerParamIndex = mLastLocal = counter();
  
  return freeze({
    receiverParameterIndex: () => kParentPointerParamIndex,
    swapA: memoize(() => mLastLocal = counter()),
    swapB: memoize(() => mLastLocal = counter()),
    localStackPointerIndex: memoize(() => mLastLocal = counter()),
    totalLocalCount: () => mLastLocal + 1
  });
}

export const WasmFunctionLocalAllocation = freeze({ make });
