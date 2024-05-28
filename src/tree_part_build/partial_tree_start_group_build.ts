import { TreePartBuild, LineContinuationScheme } from '../tree_part_build';
import { StandardError, StandardErrorFn } from '../helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Helpers } from '../helpers';
import { NodeExpansion } from './node_expansion';
import {
  LeftTreePartHandler, LeftSideNodeExpansion
} from './left_side_node_expansion';
import { Token } from '../token';
import { TokenRange } from '../token_range';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => NodeExpansion | undefined,
  error: StandardErrorFn
}

export const PartialTreeStartGroupBuild = (() => {
  const { memoize, freeze } = Helpers;

  function make(leftPartHandler: LeftTreePartHandler,
                mTokenRange: TokenRange,
                mStartToken: Token):
                PartialTreeStartGroupBuild
  {
    const { setErrorMessage, error, setErrorFn } = StandardError.make();
    const normalLineContinuation = LineContinuationScheme.normal;
    
    const nextPart = memoize(() => {
      mTokenRange.skipNewLine();
      return PartialTreeNextTokenBuild.
        make(mTokenRange, mStartToken.content());
    });

    function getLeftPart() {
      return nextPart().unprocessedPart() ?? setErrorFn(nextPart().error);
    }

    function startGroupBuild(): NodeExpansion | undefined {
      const leftPart = getLeftPart();
      if (!leftPart) {
        setErrorMessage('no left part??');
        return;
      }
      const { remainingRange } = nextPart();
      const rightPart = TreePartBuild.
        make(remainingRange(), normalLineContinuation);
      return LeftSideNodeExpansion.make(leftPartHandler, leftPart, rightPart);
    }

    return freeze({
      startGroupBuild: memoize(startGroupBuild),
      error
    });
  }

  return freeze({ make });
})();
