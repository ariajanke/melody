import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { LineContinuationScheme, TreePartBuild } from './ast_build/tree_part_build';
import { TokenRange } from './token_range';
import { Helpers } from './helpers';

export const AstBuild = (() => {
  const { freeze, memoize } = Helpers;

  const class_ = freeze({
    make: (mTokens: TokenRange) => {
      const mErrors: Readonly<{ message: string }>[] = [];

      function _buildProgramSequence
        (partBuild: TreePartBuild): Readonly<AstNode[]>
      {
        const part = partBuild.buildPart();
        if (!part) {
          mErrors.push(partBuild.error() as Readonly<{ message: string }>);
          return [];
        }
        return part.expandIntoNodes(_buildProgramSequence);
      }

      const inst = freeze({
        build: memoize((): AstTupleNode | undefined => {
          const partBuild = TreePartBuild.
            make(mTokens, LineContinuationScheme.normal);
          const res = _buildProgramSequence(partBuild).map(n => n);
          if (mErrors.length !== 0) {
            return;
          }
          return AstTupleNode.make(res);
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
