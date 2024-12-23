import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmBuiltinImportsCreation } from './wasm_builtin_imports_creation';
import { WasmFunctionDeclarationsCompilation } from './wasm_function_declarations_compilation';
import { StringPool } from '../string_pool';

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
      return freeze({
        compile:
          (mStringPool: StringPool,
           mJsPrint: (s: string | number) => void = class_.defaultJsPrint,
           mJsAskInteger: () => number = class_.makeDefaultIntegerGenerator(),
           mJsAskString?: () => number) =>// () => number = class_.makeAskString(mStringPool)) =>
        {
          mJsAskString ??= mStringPool.askString;
          const imports = WasmBuiltinImportsCreation.
            make(mStringPool, mJsPrint, mJsAskInteger, mJsAskString);
          const typesSec = imports.typesSection();
          const imptSec = imports.importsSection();
          let funcDecs = WasmFunctionDeclarationsCompilation.
            make(typesSec, WasmBuiltinImportsCreation.cloneDescriptionsCounter());
          
          funcDecs = funcDecs.declareFunction('entry', [], [], mFunctionBody, true);
          const byteCode = funcDecs.compileWith(header, imptSec);
          return [byteCode, imports.importObject()] as [Uint8Array, ReturnType<typeof imports.importObject>];
        }
      });
    }
  });
  return class_;
})();
export type WasmCompiler = ReturnType<typeof WasmCompiler.makeWithEntryImplementation>;
