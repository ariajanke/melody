import { PartialTreeBuild, PartialTreeBuildResult } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { StandardErrorsFn } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Token } from './token';
import { Helpers } from './helpers';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => PartialTreeBuildResult | undefined,
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
                incompleteNode: AstIncompleteBinaryNode | undefined,
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

    const unprocessedPart = memoize(() => {
      return nextPart().unprocessedPart() ?? (() => {
        mErrorFn = nextPart().error;
      })();
    });

    function startGroupBuild(): PartialTreeBuildResult | undefined {
      const nextPartStart = skipNewLine(mTokens, start + 1);
      const nextPart = PartialTreeNextTokenBuild.
        make(mTokens, nextPartStart, mEnd, closeBasedOn);

      const unprocessedPart = nextPart.unprocessedPart();
      if (!unprocessedPart) {
        mErrorFn = nextPart.error;
        return;
      }
      const remainingRange = nextPart.remainingRange();
      return freeze({
        completedNode: undefined,
        incompleteNode,
        unprocessedPart, // <- in group
        // make... assume anything can happen
        // v everything outside of group
        remainingPart: PartialTreeBuild.make(mTokens, ...remainingRange) 
      });
    }

    return freeze({ startGroupBuild, error: () => mErrorFn() });
  }

  return freeze({ make, skipNewLine });
})();
