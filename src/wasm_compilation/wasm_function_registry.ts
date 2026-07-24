import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { FunctionType } from '../function_type_build';
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
  const recSize = beingCalled.receiver().sizeInStackItems();
  const isFtypeOkay = 
    beingCalled.parameters().uid() === emptyTuple().uid() &&
    beingCalled.returns   ().uid() === emptyTuple().uid() &&
    (recSize === 0 || recSize === 1);
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
  const { i32 } = TypesAware.types();
  const { orderedDefinitions } = mRegistry;
  const ftypeMap = memoize(() =>
    orderedDefinitions().
    reduce((map: FtypeUidToIndex, ftype: FunctionType, idx: number) => {
      map[ftype.uid()] = idx;
      return map;
    }, {} as FtypeUidToIndex));

  const kOne = freeze([i32]);
  const kNone = freeze([]);

  const wasmTypesSection = memoize(() => {
    mTypesSection.pushFunction(kOne, kNone);
    mTypesSection.pushFunction(kNone, kNone);
    return mTypesSection;
  });

  function signatureIndexFor(mFunctionType: FunctionType) {
    assertFtypeSignatureOkay(mFunctionType);

    const pType = mFunctionType.receiver().sizeInStackItems() === 1 ?
      kOne : kNone;
    const rType = kNone;
    return wasmTypesSection().indexFor(pType, rType) ??
      raise('cannot get WASM function signature');
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
