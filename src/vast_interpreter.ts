import { Helpers, StandardErrorMessage } from './helpers';
import { VastBuild, VastNode } from './vast_build';
import { BuiltInFunction } from './function_type';
import { Tokenization } from './tokenization';
import { AstBuild } from './ast_build';
import { MemoryArray } from './memory_array';
import { ContextType } from './context_type';
import { PersistentStack } from './persistent_stack';
import { StringPool } from './context_type';

const { freeze, memoize } = Helpers;

function makeDefaultInjections() {
  return freeze({
    makeMemory: MemoryArray.make,
    makeStack : () => PersistentStack.make<number>(() => Infinity),
    makeContextType: ContextType.make,
    makeStringPool: StringPool.make,
    putsFunction: (str: string) => console.log(str)
  });
}

function construct(source: string,
                   // TODO have my own injections
                   injections = class_.defaultInjections()) {
  let mErrorsFn = (): Readonly<StandardErrorMessage[]> => {
    throw new Error('Should not call this method when no errors are set');
  };
  function interpret() {
    const tokens = Tokenization.make().tokenize(source);
    const astBuild = AstBuild.make(tokens);
    const astRoot = astBuild.build();
    if (!astRoot) {
      mErrorsFn = astBuild.errors;
      return undefined;
    }
    const mMemory = injections.makeMemory();
    const mStack  = injections.makeStack();
    const mStringPool = injections.makeStringPool(astRoot);
    const mBuild = VastBuild.make(astRoot, mStringPool, freeze({
      ...ContextType.defaultInjections(),
      putsFunction: injections.putsFunction
    }), injections.makeContextType);
    mMemory.store(MemoryArray.stackPointerLocation(), 1);
    if (!mBuild.root()) {
      mErrorsFn = mBuild.errors;
      return undefined;
    }
    return (mBuild.root() as VastNode).
      functionType().
      onBuiltIn((impl: BuiltInFunction) => { impl(mStack, mMemory); });
  }
  return freeze({
    interpret,
    errors: () => mErrorsFn()
  });
}

const class_ = freeze({
  make: construct,
  // defaultInjections: Interpreter.defaultInjections,
  defaultInjections: memoize(makeDefaultInjections)
});

export const VastInterpreter = class_;
export type VastInterpreter = ReturnType<typeof construct>;
