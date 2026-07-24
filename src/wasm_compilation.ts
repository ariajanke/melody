import { FunctionDefinitionRegistry } from './function_definition_registry';
import { FunctionType } from './function_type_build';
import { Helpers } from './helpers';
import { MelodyCodeWriter } from './wasm_compilation/melody_code_writer';
import { StringPool } from './wasm_compilation/string_pool';
import { WasmBuiltinImportsCreation }
  from './wasm_compilation/wasm_builtin_imports_creation';
import { WasmCodeSection } from './wasm_compilation/wasm_code_section';
import { WasmElementsSection } from './wasm_compilation/wasm_elements_section';
import { WasmExportsSection } from './wasm_compilation/wasm_exports_section';
import { WasmFunctionRegistry } from './wasm_compilation/wasm_function_registry';
import { WasmFunctionsSection }
  from './wasm_compilation/wasm_functions_section';
import { WasmGlobalsSection } from './wasm_compilation/wasm_globals_section';
// TODO (see below)
import { WasmMemorySection } from './wasm_compilation/wasm_memory_section';
import { WasmTableSection } from './wasm_compilation/wasm_table_section';

const { freeze, memoize } = Helpers;

export type WasmImports = { imports: { [name: string]: unknown } };

export interface WasmCompilation {
  importObject: () => WasmImports;
  byteCode: () => Uint8Array;
}

const defaultInjections = memoize(() => ({
  puts: (s: string): void => console.log(s),
  askInteger: (): number => 42,
  askString: (): number => 0
}));

const header = memoize((): readonly number[] => {
  const kMagicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
  const kModuleVersion = [0x01, 0x00, 0x00, 0x00];
  return [
    ...kMagicModuleHeader,
    ...kModuleVersion
  ];
});

function make(mRegistry: FunctionDefinitionRegistry,
              mInjections = defaultInjections())
  : WasmCompilation
{
  const mStringPool = StringPool.make();
  const mImportsCreation = WasmBuiltinImportsCreation.
    make(mStringPool,
         mInjections.puts,
         mInjections.askInteger,
         mInjections.askString);

  const wasmFunctionRegistry = memoize(() =>
    WasmFunctionRegistry.make(mImportsCreation.typesSection(), mRegistry));

  const { orderedDefinitions } = mRegistry;

  const typesSection = memoize(() => wasmFunctionRegistry().wasmTypesSection());

  const importsSection = memoize(() => {
    const imptSec = mImportsCreation.importsSection();
    imptSec.pushMemory('js', 'memory');
    return imptSec;
  });

  const functionsSection = memoize(() =>
    orderedDefinitions().
    reduce((functionsSection_: WasmFunctionsSection, implementation: FunctionType) => {
      const sigIdx = wasmFunctionRegistry().signatureIndexFor(implementation);
      functionsSection_.pushSignatureFrom(sigIdx);
      return functionsSection_;
    }, WasmFunctionsSection.make()));


  const tableSection = memoize(() => {
    const tblSec = WasmTableSection.make();
    tblSec.setFunctionCount(orderedDefinitions().length);
    return tblSec;
  });

  // TODO (see below)
  // const mMemorySection = WasmMemorySection.instance();

  const exportsSection = memoize(() => {
    const exptSec = WasmExportsSection.make();
    const rootIdx = wasmFunctionRegistry().
      indexOfRegisteredFor(mRegistry.rootDefinition());
    exptSec.pushFunction('entry', rootIdx);
    return exptSec;
  });

  const elementSection = memoize(() => {
    const elsSec = WasmElementsSection.make();
    elsSec.setStartingIndexFrom(importsSection());
    elsSec.setFunctionCount(orderedDefinitions().length);
    return elsSec;
  });

  const codeSection = memoize(() =>
    orderedDefinitions().
    reduce((codeSection_: WasmCodeSection, implementation: FunctionType) => {
      const codeWriter = MelodyCodeWriter.
        make(implementation, mStringPool, wasmFunctionRegistry());
      implementation.simpleEmit(codeWriter);
      codeWriter.appendByteCodeTo(codeSection_);
      return codeSection_;
    }, WasmCodeSection.make()));

  const byteCode = memoize(() => {
    const nums: number[] = [];
    nums.push(...header());
    nums.push(...typesSection().finish());
    nums.push(...importsSection().finish());
    nums.push(...functionsSection().finish());
    nums.push(...tableSection().finish());
    // TODO figure out what to do for the memory section
    //      nums.push(...mMemorySection.finish());
    nums.push(...WasmGlobalsSection.instance().finish());
    nums.push(...exportsSection().finish());
    nums.push(...elementSection().finish());
    nums.push(...codeSection().finish());
    return Uint8Array.from(nums);
  });

  return freeze({
    importObject: mImportsCreation.importObject,
    byteCode,
  });
}

export const WasmCompilation = freeze({ make, defaultInjections });
