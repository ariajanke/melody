import { PartialTreeBuild, NodeExpansion, PartialBuildToNodesFn } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { StandardErrorsFn, TypeCheckable } from './helpers';
import { PartialTreeNextTokenBuild } from './partial_tree_next_token_build';
import { Token } from './token';
import { Helpers } from './helpers';
import { AstNode } from './ast_node';

interface PartialTreeStartGroupBuild {
  startGroupBuild: () => NodeExpansion | undefined,
  error: StandardErrorsFn
}

export const StartGroupCombiner = (() => {
  const { freeze } = Object;
  const { type, hasCreated } = TypeCheckable.make();

  function make
    (unprocessedPart: PartialTreeBuild,
     remainingPart: PartialTreeBuild): NodeExpansion
  {
    function expandIntoNodes
      (fn: PartialBuildToNodesFn): Readonly<AstNode[]>
    { 
      return [
        ...fn(unprocessedPart),
        ...fn(remainingPart)
      ];
    }

    return freeze({ expandIntoNodes, type });
  }

  return freeze({ make, hasCreated });
})();

export const StartGroupCombinerWithIncomplete = (() => {
  const { freeze } = Object;
  const { type } = TypeCheckable.make();

  function make
    (incompleteNode: AstIncompleteBinaryNode,
     unprocessedPart: PartialTreeBuild,
     remainingPart: PartialTreeBuild): NodeExpansion
  {
    function expandIntoNodes
      (fn: PartialBuildToNodesFn): Readonly<AstNode[]>
    {
      const [head, ...tail] = fn(unprocessedPart);
      
      return [
        incompleteNode.finish(head),
        ...tail,
        ...fn(remainingPart)
      ];
    }

    return freeze({ expandIntoNodes, type });
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

    function startGroupBuild(): NodeExpansion | undefined {
      const unprocessedPart = getUnprocessedPart();
      if (!unprocessedPart) {
        return;
      }
      const remainingRange = nextPart().remainingRange();
      const remainingPart = PartialTreeBuild.make(mTokens, ...remainingRange);
      if (incompleteNode)
        return StartGroupCombinerWithIncomplete.make(incompleteNode, unprocessedPart, remainingPart);
      else
        return StartGroupCombiner.make(unprocessedPart, remainingPart);
    }

    return freeze({
      startGroupBuild: memoize(startGroupBuild),
      error: () => mErrorFn()
    });
  }

  return freeze({ make, skipNewLine });
})();
