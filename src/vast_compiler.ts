import { AstBuild } from './ast_build';
import { BuiltInFunction, CallingContext } from './function_type';
import { Helpers, StandardErrorMessage } from './helpers';
import { StringPool } from './string_pool';
import { Tokenization } from './tokenization';
import { VastBuild } from './vast_build';
import { VastNode } from './vast_node';
import { WasmCodeWriter } from './wasm_compilation';

const { freeze, expose } = Helpers;

function construct(source: string) {
  let mErrorsFn = (): Readonly<StandardErrorMessage[]> => {
    throw new Error('Should not call this method when no errors are set');
  };
  const tokens = Tokenization.make().tokenize(source);
  const astBuild = AstBuild.make(tokens);
  const astRoot = astBuild.build();
  if (!astRoot) {
    mErrorsFn = astBuild.errors;
    return undefined;
  }
  const mStringPool = StringPool.make(astRoot);
  const mCodeWriter = WasmCodeWriter.make();
  const mBuild = VastBuild.make(astRoot, mStringPool);
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
    compile: () => mCodeWriter.makeCompilerFromCode().compile(mStringPool),
    errors: mErrorsFn
  });
}

const class_ = freeze({ make: construct });

export const VastCompiler = class_;
export type  VastCompiler = ReturnType<typeof construct>;
expose({ VastCompiler });
