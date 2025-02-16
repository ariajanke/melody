import { Helpers, StandardErrorMessage } from './helpers';
import { AstBuild, VastBuild } from './vast_build';
import { CallingContext } from './function_type';
import { Tokenization } from './tokenization';
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
    makeStringPool: VastBuild.makeStringPoolFrom,
    putsFunction: (str: string) => console.log(str)
  });
}

function construct(mSource: string,
                   mInjections = class_.defaultInjections()) {
  let mErrorsFn = (): Readonly<StandardErrorMessage[]> => {
    throw new Error('Should not call this method when no errors are set');
  };
  function interpret() {
    const tokens = Tokenization.make().tokenize(mSource);
    const astBuild = AstBuild.make(tokens);
    const astRoot  = astBuild.build();
    if (!astRoot) {
      mErrorsFn = astBuild.errors;
      return undefined;
    }

    const stringPool = mInjections.makeStringPool(astRoot);
    const build = VastBuild.make(astRoot, stringPool, freeze({
      ...ContextType.defaultInjections(),
      putsFunction: mInjections.putsFunction
    }), mInjections.makeContextType);
    const { putsFunction, makeMemory, makeStack } = mInjections;
    if (!build.root()) {
      mErrorsFn = build.errors;
      return undefined;
    }

    const mCodeWriter = InterpretedCodeWriter.
      make(build.stringPool() as StringPool,
           {
             ...InterpretedCodeWriter.defaultInjections(),
             putsFunction, makeMemory, makeStack
           });
    const functionType = (build.root() as VastNode).functionType();
    functionType.builtIn()(CallingContext.canTakeAll(), mCodeWriter);
    return functionType;
      // onBuiltIn((impl: BuiltInFunction) => {
      //   impl(CallingContext.canTakeAll(), mCodeWriter);
      // });
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
Helpers.expose({ VastInterpreter });
