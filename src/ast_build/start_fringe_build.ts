import { AstFringeNode } from '../ast_fringe_node';
import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ContinuingAfterSingleValueBuild } from './continuing_after_single_value_build';

const { freeze } = Helpers;

export const StartFringeBuild = (() => {
  return freeze({
    make: (mFringeToken: Token,
           mTokenRange: TokenRange) =>
    {
      const { error, setErrorFn } = StandardError.make();
      
      function fringeNode() {
        return AstFringeNode.makeForToken(mFringeToken);
      }

      function buildFringeWithRangeAsNewPart() {
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushNode(fringeNode());
          if (!mTokenRange.isEmpty()) {
            sink.pushPart(TreePartBuild.make(mTokenRange));
          }
        });
      }

      return freeze({
        build: (): BuildStateAddition | undefined => {
          if (mTokenRange.isEmpty()) {
            return buildFringeWithRangeAsNewPart();
          }
          const node = AstFringeNode.makeForToken(mFringeToken);
          const { build, error } = ContinuingAfterSingleValueBuild.make(mTokenRange, node);
          return build() ?? setErrorFn(error);
        },
        error
      });
    }
  });
})();
