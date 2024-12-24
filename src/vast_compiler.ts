import { BuiltInFunction, CallingContext } from './function_type';
import { Helpers, StandardErrorMessage } from './helpers';
import { StringPool } from './string_pool';
import { Tokenization } from './tokenization';
import { AstBuild, VastBuild } from './vast_build';
import { VastNode } from './vast_node';
import { WasmCodeWriter } from './wasm_compilation';

const { freeze, expose } = Helpers;

function construct(mSource: string) {
  let mErrorsFn = (): Readonly<StandardErrorMessage[]> => {
    throw new Error('Should not call this method when no errors are set');
  };
  const tokens = Tokenization.make().tokenize(mSource);
  const astBuild = AstBuild.make(tokens);
  const astRoot  = astBuild.build();
  if (!astRoot) {
    mErrorsFn = astBuild.errors;
    return undefined;
  }

  const stringPool = VastBuild.makeStringPoolFrom(astRoot);
  const mCodeWriter = WasmCodeWriter.make();
  const mBuild = VastBuild.make(astRoot, stringPool);
  if (!mBuild.root()) {
    mErrorsFn = mBuild.errors;
    return undefined;
  }
  (mBuild.root() as VastNode).
    functionType().
    onBuiltIn((impl: BuiltInFunction) => {
      impl(CallingContext.canTakeAll(), mCodeWriter);
    });
  return freeze({
    compile: () => mCodeWriter.
      makeCompilerFromCode().
      compile(mBuild.stringPool() as StringPool),
    errors: mErrorsFn
  });
}

const class_ = freeze({ make: construct });

export const VastCompiler = class_;
export type  VastCompiler = ReturnType<typeof construct>;
expose({ VastCompiler });
