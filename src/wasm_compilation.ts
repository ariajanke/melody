import { FunctionType } from './function_type_build';
import { FunctionTypeIndexGrabber } from './function_type_index_grabber';
import { Helpers } from './helpers';
import { StringPool } from './string_pool';
import { WasmBuiltinImportsCreation }
  from './wasm_compilation/wasm_builtin_imports_creation';
import { WasmCodeSection } from './wasm_compilation/wasm_code_section';
import { WasmElementsSection } from './wasm_compilation/wasm_elements_section';
import { WasmExportsSection } from './wasm_compilation/wasm_exports_section';
import { WasmFunctionCodeWriter }
  from './wasm_compilation/wasm_function_code_writer';
import { WasmFunctionsSection }
  from './wasm_compilation/wasm_functions_section';
import { TypesAware } from './wasm_compilation/wasm_helpers';
import { WasmMemorySection } from './wasm_compilation/wasm_memory_section';
import { WasmTableSection } from './wasm_compilation/wasm_table_section';

const { freeze, memoize } = Helpers;

export type WasmImports = { imports: { [name: string]: unknown } };

export interface WasmCompilation {
  importObject: () => WasmImports;
  byteCode: () => Uint8Array;
  incorporate(implementation: FunctionType,
              indexEmission: FunctionType): void;
  makeEntryPoint(rootIndexEmission: FunctionType): void;
}

const defaultInjections = memoize(() => ({
  puts: (s: string) => console.log(s),
  askInteger: () => 42,
  askString: () => 0
}));

const header = memoize((): readonly number[] => {
  const kMagicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
  const kModuleVersion = [0x01, 0x00, 0x00, 0x00];
  return [
    ...kMagicModuleHeader,
    ...kModuleVersion
  ];
});

function make(mStringPool: StringPool,
              mInjections = defaultInjections())
  : WasmCompilation
{
  const mImportsCreation = WasmBuiltinImportsCreation.
    make(mStringPool,
         mInjections.puts,
         mInjections.askInteger,
         mInjections.askString);
  const mImportsSection = mImportsCreation.importsSection();
  const mTypesSection = mImportsCreation.typesSection();
  const mFunctionsSection = WasmFunctionsSection.make();
  const mTableSection = WasmTableSection.make();
  const mMemorySection = WasmMemorySection.instance();
  const mExportsSection = WasmExportsSection.make();
  const mElementSection = WasmElementsSection.
    make().
    setStartingIndexFrom(mImportsSection);
  const mCodeSection = WasmCodeSection.make();
  let mFunctionCount = 0;

  const { importObject } = mImportsCreation;
  const byteCode = memoize(() => {
    mElementSection.setFunctionCount(mFunctionCount);
    mTableSection.setFunctionCount(mFunctionCount);
    const nums: number[] = [];
    nums.push(...header());
    nums.push(...mTypesSection.finish());
    nums.push(...mImportsSection.finish());
    nums.push(...mFunctionsSection.finish());
    nums.push(...mTableSection.finish());
    nums.push(...mMemorySection.finish());
    nums.push(...mExportsSection.finish());
    nums.push(...mElementSection.finish());
    nums.push(...mCodeSection.finish());
    return Uint8Array.from(nums);
  });

  const mIndexGrabber = FunctionTypeIndexGrabber.make();
  function incorporate
    (implementation: FunctionType,
     _1: FunctionType)
  {
    const codeWriter = WasmFunctionCodeWriter.make();
    implementation.emit(codeWriter);
    const { i32 } = TypesAware.types();
    mTypesSection.pushFunction([i32], []);
    const typeIndex = mTypesSection.indexFor([i32], []);
    if (typeIndex === undefined) {
      throw new Error('Failed to register type');
    }
    mCodeSection.pushFunctionBody(codeWriter.toFunctionBody());
    mFunctionsSection.pushSignatureFrom(typeIndex);
    ++mFunctionCount;
  }
  function makeEntryPoint(rootIndexEmission: FunctionType) {
    const index =
      mIndexGrabber.grabFrom(rootIndexEmission) +
      mImportsSection.functionCount();
    mExportsSection.pushFunction('entry', index);
  }

  return freeze({
    importObject,
    byteCode,
    incorporate,
    makeEntryPoint
  });
}

export const WasmCompilation = freeze({ make, defaultInjections });
