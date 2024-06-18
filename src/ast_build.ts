import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { TreePartBuild } from './ast_build/tree_part_build';
import { TokenRange } from './token_range';
import { Helpers } from './helpers';
import { BuildState } from './ast_build/build_state';

export const AstBuild = (() => {
  const { freeze, memoize } = Helpers;

  const class_ = freeze({
    make: (mTokens: TokenRange) => {
      const mErrors: Readonly<{ message: string }>[] = [];
      const mBuildState = BuildState.make();

      const inst = freeze({
        build: memoize((): AstTupleNode | undefined => {
          mBuildState.pushPart( TreePartBuild.make(mTokens) );

          while (mBuildState.hasRemainingParts()) {
            const part = mBuildState.popPart();
            const addition = part.build();
            if (!addition) {
              mErrors.push( part.error() );
              return;
            }
            addition.pushTo(mBuildState);
          }

          return mBuildState.finish();
        }),
        errors: () => mErrors
      });

      return inst;
    },

    buildFor: (tokens: TokenRange): AstNode => {
      const res = class_.make(tokens).build();
      if (!res) {
        throw Error('Cannot use buildFor for errorful tokens');
      }
      return res;
    }
  });

  return class_;
})();
