import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';

const { freeze, memoize, makeCounter } = Helpers;

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

function assertFtypeSignatureOkay(beingCalled: FunctionType): void {
  const emptyTuple = memoize(() =>
    FunctionType.emitEmptyTuple().parameters());
  const isFtypeOkay = 
    beingCalled.parameters().uid() === emptyTuple().uid() &&
    beingCalled.returns   ().uid() === emptyTuple().uid() &&
    beingCalled.receiver  ().sizeInStackItems() === 1;
  if (!isFtypeOkay) {
    raise('only one call signature supported');
  }
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

export const WasmFunctionLocalAllocation = freeze({
  make,
  assertFtypeSignatureOkay
});
