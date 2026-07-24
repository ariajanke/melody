import { FunctionDefinitionRegistry, FunctionType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { TypesAware } from './wasm_helpers';
import { WasmTypesSection } from './wasm_types_section';

const { freeze, memoize } = Helpers;

export interface WasmFunctionRegistry {
  signatureIndexFor(functionType: FunctionType): number;
  indexOfRegisteredFor(functionType: FunctionType): number;
  wasmTypesSection(): WasmTypesSection;
};

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

function make
  (mTypesSection: WasmTypesSection,
   mRegistry: FunctionDefinitionRegistry)
  : WasmFunctionRegistry
{
  type FtypeUidToIndex = { [uid: symbol]: number | undefined };
  const { orderedDefinitions } = mRegistry;
  const ftypeMap = memoize(() =>
    orderedDefinitions().
    reduce((map: FtypeUidToIndex, ftype: FunctionType, idx: number) => {
      map[ftype.uid()] = idx;
      return map;
    }, {} as FtypeUidToIndex));

  const supportedFunctionSignatureIndex = memoize(() => {
    const { i32 } = TypesAware.types();
    mTypesSection.pushFunction([i32], []);
    const typeIndex = mTypesSection.indexFor([i32], []);
    if (typeIndex === undefined) {
      raise('Failed to register type');
    }
    return typeIndex;
  });

  const wasmTypesSection = memoize(() => {
    supportedFunctionSignatureIndex();
    return mTypesSection;
  });

  function signatureIndexFor(mFunctionType: FunctionType) {
    assertFtypeSignatureOkay(mFunctionType);
    return supportedFunctionSignatureIndex();
  }

  const indexOfRegisteredFor = (ftype: FunctionType) =>
    ftypeMap()[ftype.uid()] ?? raise('ftype not registered');

  return freeze({
    signatureIndexFor,
    indexOfRegisteredFor,
    wasmTypesSection
  });
}

export const WasmFunctionRegistry = freeze({
  make,
  assertFtypeSignatureOkay
});
