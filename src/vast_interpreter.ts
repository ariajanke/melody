import { Helpers, StandardErrorMessage } from './helpers';
import { VastBuild } from './vast_build';
import { BuiltInFunction, CallingContext } from './function_type';
import { Tokenization } from './tokenization';
import { AstBuild } from './ast_build';
import { MemoryArray } from './memory_array';
import { ContextType } from './context_type';
import { PersistentStack } from './persistent_stack';
import { StringPool } from './string_pool';
import { VastNode } from './vast_node';
import { InterpretedCodeWriter } from './interpreted_code_writer';

const { freeze, memoize } = Helpers;

function makeDefaultInjections() {
  return freeze({
    makeMemory: MemoryArray.make,
    makeStack : () => PersistentStack.make<number>(() => Infinity),
    makeContextType: ContextType.makeWritable,
    makeStringPool: StringPool.make,
    putsFunction: (str: string) => console.log(str)
  });
}

function construct(source: string,
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
    const mStringPool = injections.makeStringPool(astRoot);
    const { putsFunction, makeMemory, makeStack } = injections;
    const codeWriter = InterpretedCodeWriter.make(mStringPool, {
      ...InterpretedCodeWriter.defaultInjections(),
      putsFunction, makeMemory, makeStack
    });
    
    const mBuild = VastBuild.make(astRoot, mStringPool, freeze({
      ...ContextType.defaultInjections(),
      putsFunction: injections.putsFunction
    }), injections.makeContextType);
    if (!mBuild.root()) {
      mErrorsFn = mBuild.errors;
      return undefined;
    }
    return (mBuild.root() as VastNode).
      functionType().
      onBuiltIn((impl: BuiltInFunction) => {
        impl(CallingContext.canTakeAll(), codeWriter);
      });
  }
  return freeze({
    interpret,
    errors: () => mErrorsFn()
  });
}

const class_ = freeze({
  make: construct,
  defaultInjections: memoize(makeDefaultInjections)
});

export const VastInterpreter = class_;
export type VastInterpreter = ReturnType<typeof construct>;
