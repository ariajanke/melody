import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { StandardErrorsFn } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Token } from './token';

export const PartialTreeStartGroupBuild = (() => {
  const { freeze } = Object;

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
                closeBasedOn: string)//:
                //PartialTreeBuildResult | undefined
  {
    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    function startGroupBuild() {
      // skip to opening token
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
        unprocessedPart, // <- in group //: make(mTokens, ...remainingRange),
        // make... assume anything can happen
        remainingPart: PartialTreeBuild.make(mTokens, ...remainingRange) // <- everything outside of group //unprocessedPart
      });
    }

    return freeze({ startGroupBuild, error: () => mErrorFn() });
  }

  return freeze({ make, skipNewLine });
})();
