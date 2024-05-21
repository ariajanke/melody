import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { StandardErrorsFn } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Token } from './token';
import { Helpers } from './helpers';
import { NodeExpansion } from './node_expansion';
import {
  LeftTreePartHandler, StartGroupNodeExpansion
} from './start_group_node_expansion';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => NodeExpansion | undefined,
  error: StandardErrorsFn
}

export const PartialTreeStartGroupBuild = (() => {
  const { memoize, freeze } = Helpers;

  function skipNewLine(tokens: TokenCollection, i: number): number {
    if (tokens.at(i).type() === Token.types.newLine) {
      // a note about new line tokens
      // they're guarnteed to not come in multiples, enforced on make
      return i + 1;
    }
    return i;
  }

  function make(mTokens: TokenCollection,
                leftPartHandler: LeftTreePartHandler,
                start: number,
                mEnd: number,
                closeBasedOn: string):
                PartialTreeStartGroupBuild
  {
    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    const nextPart = memoize(() => {
      const nextPartStart = skipNewLine(mTokens, start + 1);
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
        return;
      }
      const remainingRange = nextPart().remainingRange();
      const rightPart = PartialTreeBuild.make(mTokens, ...remainingRange);
      return StartGroupNodeExpansion.make(leftPartHandler, leftPart, rightPart)
    }

    return freeze({
      startGroupBuild: memoize(startGroupBuild),
      error: () => mErrorFn()
    });
  }

  return freeze({ make, skipNewLine });
})();
