import { FunctionRegistryBuild } from './function_registry_build';
import { Helpers } from './helpers';
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

  const compile = memoize(() => {
    const build = FunctionRegistryBuild.make(mSource);
    const { functionRegistry, stringPool } = build;
    if (!functionRegistry() || !stringPool()) {
      mError = build.error();
      return undefined;
    }

    const wasmCompilation = WasmCompilation.make(stringPool()!, mInjections);
    functionRegistry()!.forEach(wasmCompilation.incorporate);
    wasmCompilation.makeEntryPoint(build.rootIndexEmission()!);
    return wasmCompilation;
  });

  const byteCode = () => compile()?.byteCode();
  const importsObject = () => compile()?.importObject();

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
