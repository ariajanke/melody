import { Helpers } from '../helpers';
import { SimpleCounter, type SymFunc } from './wasm_helpers';
import { WasmTypesSection } from './wasm_types_section';
import { WasmCodeSection } from './wasm_code_section';
import { WasmExportsSection } from './wasm_exports_section';
import { WasmFunctionsSection } from './wasm_functions_section';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmImportsSection } from './wasm_imports_section';

const { freeze } = Helpers;

export const WasmFunctionDeclarationsCompilation = (() => {
  const class_ = freeze({
    make(mTypesSection: WasmTypesSection,
         mDeclarationCounter = SimpleCounter.make(),
         mCodeSection: WasmCodeSection = WasmCodeSection.make(),
         mExportsSection: WasmExportsSection = WasmExportsSection.make(),
         mFunctionSection = WasmFunctionsSection.make())
    {
      return freeze({
        declareFunction(
          name: string,
          arguments_: SymFunc[],
          returns: SymFunc[],
          implementation: WasmFunctionBody,
          isExported: boolean)
        {
          mTypesSection = mTypesSection.pushFunction(arguments_, returns);
          const idx = mTypesSection.indexFor(arguments_, returns);
          if (idx === undefined) {
            throw new Error('misbehavior from WasmTypeSection');
          }
          // must run this
          const declIdx = mDeclarationCounter.next();
          const toExport = isExported ?
            mExportsSection.pushFunction(name, declIdx) :
            mExportsSection;
          return class_.
            make(mTypesSection,
              mDeclarationCounter,
                 mCodeSection.pushFunctionBody(implementation),
                 toExport,
                 mFunctionSection.pushSignatureFrom(idx));
        },
        compileWith: (makeHeader: () => number[], importsSection: WasmImportsSection) => {
          return Uint8Array.from([
            ...makeHeader(),
            ...mTypesSection.finish(),
            ...importsSection.finish(),
            ...mFunctionSection.finish(),
            ...mExportsSection.finish(),
            ...mCodeSection.finish()
          ]);
        }
      });
    }
  });
  return class_;
})();
export type WasmFunctionDeclarationsCompilation =
  ReturnType<typeof WasmFunctionDeclarationsCompilation.make>;
