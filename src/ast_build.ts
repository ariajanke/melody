import { AstNode } from './ast_node';
import { TreePartBuild } from './ast_build/tree_part_build';
import { TokenRange } from './token_range';
import { Helpers } from './helpers';
import { BuildState } from './ast_build/build_state';

export const AstBuild = (() => {
  const { freeze, memoize } = Helpers;

  const class_ = freeze({
    make: (mTokens: TokenRange) => {
      const mErrors: Readonly<{ message: string }>[] = [];
      const mBuildState = BuildState.make(mErrors, mTokens.clone());

      const inst = freeze({
        build: memoize((): AstNode | undefined => {
          mBuildState.pushPart( TreePartBuild.make(mTokens) );
          console.log(`init ${mBuildState.asString()}`);
          while (mBuildState.hasRemainingParts()) {
            const part = mBuildState.popPart();
            const addition = part.build();
            if (!addition) {
              mErrors.push( part.error() );
              return;
            }
            addition.pushTo(mBuildState);
          }
          console.log(`on complete ${mBuildState.asString()}`);
          return mBuildState.complete();
        }),
        errors: () => mErrors
      });

      return inst;
    },

    buildFor: (tokens: TokenRange): AstNode => {
      const inst = class_.make(tokens);
      const res = inst.build();
      if (!res) {
        throw Error(`Failed to build AST:\n${inst.errors()[0]?.message}`);
      }
      return res;
    }
  });

  return class_;
})();
