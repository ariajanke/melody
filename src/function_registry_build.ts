import { AstBuild } from './ast_build';
import { DastBuild } from './dast_build';
import { FunctionType, FunctionTypeBuild } from './function_type_build';
import { FunctionTypeRegistry } from './function_type_registry';
import { Helpers } from './helpers';
import { StringPool, StringPoolBuilder } from './string_pool';
import { Tokenization } from './tokenization';

const { freeze, memoize } = Helpers;

export interface FunctionRegistryBuild {
  functionRegistry(): FunctionTypeRegistry | undefined;
  rootIndexEmission(): FunctionType | undefined;
  stringPool(): StringPool | undefined;
  error(): string | undefined;
};

function make(mSource: string): FunctionRegistryBuild {
  let mError: string | undefined = undefined; // :(
  const stringPoolBuilder = StringPoolBuilder.make();
  const functionRegistry = FunctionTypeRegistry.make();

  const astBuild = memoize(() => {
    const tokenization = Tokenization.make();
    const tokenRange = tokenization.tokenize(mSource);
    
    return AstBuild.make(tokenRange);
  });

  const dastBuild = memoize(() => {
    const iast = astBuild().build();
    if (!iast) {
      mError = `Failed to build IAST: ${astBuild().errors().map(e => e.message).join(', ')}`;
      return undefined;
    }
    return DastBuild.make(iast);
  });

  const rootIndexEmission = memoize(() => {
    const dastBuild_ = dastBuild();
    if (!dastBuild_)
      { return undefined; }

    const dast = dastBuild_.node();
    if (!dast) {
      mError = `Failed to build DAST: ${dastBuild_.error()}`;
      return undefined;
    }

    const rootIndexEmissionBuild = FunctionTypeBuild.
      make(dast, stringPoolBuilder, functionRegistry);
    const rootIndexEmission = rootIndexEmissionBuild.functionType();
    if (!rootIndexEmission) {
      mError = `Failed to build function type: ${rootIndexEmissionBuild.error().message}`;
      return undefined;
    }
    return rootIndexEmission;
  });

  const registryAndPool = memoize(() => {
    const rootIndexEmission_ = rootIndexEmission();
    if (!rootIndexEmission_)
      { return undefined; }

    const rootFunctionType = functionRegistry.reverseLookUp(rootIndexEmission_);
    if (!rootFunctionType) {
      throw new Error('No corresponding implementation for root index emission');
    }
    
    const stringPool = stringPoolBuilder.finish();
    return [functionRegistry, stringPool] as const;
  });

  return freeze({
    functionRegistry: () => registryAndPool()?.[0],
    stringPool: () => registryAndPool()?.[1],
    rootIndexEmission,
    error: () => mError
  });
}

export const FunctionRegistryBuild = freeze({ make });
