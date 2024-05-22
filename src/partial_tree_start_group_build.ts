import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardErrorsFn } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Helpers } from './helpers';
import { NodeExpansion } from './node_expansion';
import {
  LeftTreePartHandler, LeftSideNodeExpansion
} from './left_side_node_expansion';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => NodeExpansion | undefined,
  error: StandardErrorsFn
}

export const PartialTreeStartGroupBuild = (() => {
  const { memoize, freeze } = Helpers;

  function make(mTokens: TokenCollection,
                leftPartHandler: LeftTreePartHandler,
                start: number,
                mEnd: number,
                closeBasedOn: string):
                PartialTreeStartGroupBuild
  {
    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    const nextPart = memoize(() => {
      const nextPartStart = mTokens.skipNewLine(start + 1);
      return PartialTreeNextTokenBuild.
        make(mTokens, nextPartStart, mEnd, closeBasedOn);
    });

    function getLeftPart() {
      return nextPart().unprocessedPart() ?? (() => {
        mErrorFn = nextPart().error;
      })();
    }

    function startGroupBuild(): NodeExpansion | undefined {
      const leftPart = getLeftPart();
      if (!leftPart) {
        mErrorFn = () => freeze({ message: 'no left part??' });
        return;
      }
      const remainingRange = nextPart().remainingRange();
      const rightPart = PartialTreeBuild.make(mTokens, ...remainingRange);
      return LeftSideNodeExpansion.make(leftPartHandler, leftPart, rightPart)
    }

    return freeze({
      startGroupBuild: memoize(startGroupBuild),
      error: () => mErrorFn()
    });
  }

  return freeze({ make });
})();
