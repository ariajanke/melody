import { AstFringeNode } from '../ast_fringe_node';
import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ContinuingAfterFringeBuild } from './continuing_after_fringe_build';

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
          const { build, error } = ContinuingAfterFringeBuild.make(mTokenRange, node);
          return build() ?? setErrorFn(error);
        },
        error
      });
    }
  });
})();
