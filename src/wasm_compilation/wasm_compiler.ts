import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmBuiltinImportsCreation } from './wasm_builtin_imports_creation';
import { WasmFunctionDeclarationsCompilation } from './wasm_function_declarations_compilation';
import { StringPool } from '../string_pool';
import { TypesAware } from './wasm_helpers';

const { memoize, freeze } = Helpers;

export const WasmCompiler = (() => {
  const kMagicModuleHeader = [0x00, 0x61, 0x73, 0x6d];
  const kModuleVersion = [0x01, 0x00, 0x00, 0x00];

  const header = memoize(() =>
    [
      ...kMagicModuleHeader,
      ...kModuleVersion
    ]);

  function makeDefaultIntegerGenerator(start: number = 2, end: number = 1000) {
    let n = start;
    return () => n = (n + 1 > end) ? start : n + 1;
  }

  const class_ = freeze({
    defaultJsPrint(s: string | number)
      { console.log(s); },
    makeAskString: (strings: string[]) =>
      class_.makeDefaultIntegerGenerator(0, strings.length),
    makeDefaultIntegerGenerator,
    makeWithEntryImplementation(mFunctionBody: WasmFunctionBody) {
      const { i32 } = TypesAware.wasmTypes();
      return freeze({
        compile:
          (mStringPool: StringPool,
           mJsPrint: (s: string) => void = class_.defaultJsPrint,
           mJsAskInteger: () => number = class_.makeDefaultIntegerGenerator(),
           mJsAskString?: () => number) =>
        {
          mJsAskString ??= mStringPool.askString;
          const imports = WasmBuiltinImportsCreation.
            make(mStringPool, mJsPrint, mJsAskInteger, mJsAskString);
          const typesSec = imports.typesSection();
          const imptSec = imports.importsSection();
          let funcDecs = WasmFunctionDeclarationsCompilation.
            make(typesSec, WasmBuiltinImportsCreation.cloneDescriptionsCounter());
          mFunctionBody.pushI32Const(0);
          funcDecs = funcDecs.declareFunction('entry', [], [i32], mFunctionBody, true);
          const byteCode = funcDecs.compileWith(header, imptSec);
          return [byteCode, imports.importObject()] as [Uint8Array, ReturnType<typeof imports.importObject>];
        }
      });
    }
  });
  return class_;
})();
export type WasmCompiler = ReturnType<typeof WasmCompiler.makeWithEntryImplementation>;
