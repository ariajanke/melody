import { FunctionDefinitionRegistry } from './function_definition_registry';
import { FunctionTypeBuild } from './function_type_build';
import { Helpers, StandardErrorMessage } from './helpers';
import { AstBuild } from './ast_build';
import { Tokenization } from './tokenization';
import { WasmCompilation, WasmImports } from './wasm_compilation';

const { freeze, memoize } = Helpers;

export interface Compiler {
  byteCode(): Uint8Array | undefined;
  importsObject(): WasmImports | undefined;
  error(): string | undefined;
};

function make(mSource: string,
              mInjections = WasmCompilation.defaultInjections())
  : Compiler
{
  let mError: string | undefined = undefined;

  const astBuild = memoize(() => {
    const tokenization = Tokenization.make(mSource);
    
    return AstBuild.make(tokenization.tokens());
  });

  const functionRegistry = memoize(() => {
    if (!astBuild()) {
      return undefined;
    }
    const rootNode = astBuild()!.node();
    if (!rootNode) {
      mError = astBuild()!.errors().map((v: StandardErrorMessage) => v.message).join(', ');
      return undefined;
    }

    const functionRegistry_ = FunctionDefinitionRegistry.make();
    const ftypeBuild = FunctionTypeBuild.make(rootNode, functionRegistry_);
    if (!ftypeBuild.functionType()) {
      mError = ftypeBuild.error().message;
      return undefined;
    }

    return functionRegistry_;
  });

  const compile = memoize(() => {
    if (!functionRegistry())
      { return undefined; }

    return WasmCompilation.make(functionRegistry()!, mInjections);
  });

  const byteCode = (): Uint8Array | undefined => compile()?.byteCode();
  const importsObject = (): WasmImports | undefined => compile()?.importObject();

  return freeze({
    byteCode,
    importsObject,
    error() { return mError; }
  });
}

export const Compiler = freeze({
  make,
  defaultInjections: WasmCompilation.defaultInjections
});

Helpers.expose({ Compiler });
