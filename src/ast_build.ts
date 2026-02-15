import { TreePartBuild } from './ast_build/tree_part_build';
import { BuildState } from './ast_build/build_state';

import { TokenRange } from './token_range';
import { Helpers } from './helpers';
import { IastNode } from './iast_node';

export const AstBuild = (() => {
  const { freeze, memoize } = Helpers;

  let sPrintOutTpbs = false;

  const class_ = freeze({
    setPrintOutsEnabled: (b: boolean) => {
      sPrintOutTpbs = b;
    },
    make: (mTokens: TokenRange) => {
      const mErrors: Readonly<{ message: string }>[] = [];
      const mBuildState = BuildState.make(mErrors);

      const inst = freeze({
        build: memoize((): IastNode | undefined => {
          mBuildState.pushPart( TreePartBuild.make(mTokens) );
          if (sPrintOutTpbs) {
            console.log(`init ${mBuildState.asString()}`);
          }
          while (mBuildState.hasRemainingParts()) {
            if (sPrintOutTpbs) {
              console.log(mBuildState.asString());
            }
            const part = mBuildState.popPart();
            const addition = part.build();
            if (!addition) {
              mErrors.push( part.error() );
              return;
            }
            addition.pushTo(mBuildState);
          }
          if (sPrintOutTpbs) {
            console.log(`on complete ${mBuildState.asString()}`);
          }
          return mBuildState.complete();
        }),
        errors: () => mErrors
      });

      return inst;
    },

    buildFor: (tokens: TokenRange): IastNode => {
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
