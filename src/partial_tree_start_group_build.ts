import { PartialTreeBuild, LineContinuationScheme } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardError, StandardErrorFn } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Helpers } from './helpers';
import { NodeExpansion } from './node_expansion';
import {
  LeftTreePartHandler, LeftSideNodeExpansion
} from './left_side_node_expansion';
import { Token } from './token';
import { TokenRange } from './token_range';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => NodeExpansion | undefined,
  error: StandardErrorFn
}

export const PartialTreeStartGroupBuild = (() => {
  const { memoize, freeze } = Helpers;

  function make(mTokens: TokenCollection,
                leftPartHandler: LeftTreePartHandler,
                mStartToken: Token,
                mStart: number,
                mEnd: number):
                PartialTreeStartGroupBuild
  {
    const { setErrorMessage, error, setErrorFn } = StandardError.make();
    const normalLineContinuation = LineContinuationScheme.normal;
    const mTokenRange = TokenRange.make(mTokens, mStart, mEnd);

    const nextPart = memoize(() => {
      // const nextPartStart = mTokens.skipNewLine(mStart);
      mTokenRange.skipNewLine();
      return PartialTreeNextTokenBuild.
        make(mTokens, mTokenRange.start(), mTokenRange.end(), mStartToken.content());
        // make(mTokens, nextPartStart, mEnd, mStartToken.content());
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
      const rightPart = PartialTreeBuild.
        make(mTokens, ...remainingRange(), normalLineContinuation);
      return LeftSideNodeExpansion.make(leftPartHandler, leftPart, rightPart);
    }

    return freeze({
      startGroupBuild: memoize(startGroupBuild),
      error
    });
  }

  return freeze({ make });
})();
