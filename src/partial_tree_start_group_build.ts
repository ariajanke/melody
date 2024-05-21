import { PartialTreeBuild, PartialTreeBuildResult } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { StandardErrorsFn } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Token } from './token';
import { Helpers } from './helpers';
import { AstNode } from './ast_node';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => PartialTreeBuildResult | undefined,
  error: StandardErrorsFn
}

const StartGroupCombiner = (() => {
  const { freeze } = Object;

  function make
    (unprocessedPart: PartialTreeBuild,
     remainingPart: PartialTreeBuild)
  {
    function stuff(fn: (partBuild: PartialTreeBuild) => AstNode[]) {      
      const pr: AstNode[] =
        [
          ...fn(unprocessedPart),
          ...fn(remainingPart)
        ];
      return pr;
    }

    return freeze({ stuff });
  }

  return freeze({ make });
})();

const StartGroupCombinerWithIncomplete = (() => {
  const { freeze } = Object;

  function make
    (incompleteNode: AstIncompleteBinaryNode,
     unprocessedPart: PartialTreeBuild,
     remainingPart: PartialTreeBuild)
  {
    function stuff(fn: (partBuild: PartialTreeBuild) => AstNode[]) {
      const [head, ...tail] = fn(unprocessedPart);
      
      const pr: AstNode[] =
        [
          incompleteNode.finish(head),
          ...tail,
          ...fn(remainingPart)
        ];
      return pr;
    }

    return freeze({ stuff });
  }

  return freeze({ make });
})();


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

    function getUnprocessedPart() {
      return nextPart().unprocessedPart() ?? (() => {
        mErrorFn = nextPart().error;
      })();
    }

    function startGroupBuild(): PartialTreeBuildResult | undefined {
      const unprocessedPart = getUnprocessedPart();
      if (!unprocessedPart) {
        return;
      }
      const remainingRange = nextPart().remainingRange();
      const remainingPart = PartialTreeBuild.make(mTokens, ...remainingRange);
      if (incompleteNode)
        StartGroupCombinerWithIncomplete.make(incompleteNode, unprocessedPart, remainingPart);
      else
        StartGroupCombiner.make(unprocessedPart, remainingPart);
      return freeze({
        completedNode: undefined,
        incompleteNode,
        unprocessedPart, // <- in group
        // make... assume anything can happen
        // v everything outside of group
        remainingPart
      });
    }

    return freeze({
      startGroupBuild: memoize(startGroupBuild),
      error: () => mErrorFn()
    });
  }

  return freeze({ make, skipNewLine });
})();
