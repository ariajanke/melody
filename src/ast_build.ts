import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';

export const AstBuild = (() => {
  function buildProgramSequence
    (partBuild: PartialTreeBuild, tokens: TokenCollection):
    AstNode[]
  {
    const res = partBuild.buildPart();

    if (res === undefined) {
      throw Error(partBuild.error()?.message ?? 'undefined behavior');
    } else if (res.completedNode !== undefined) {
      // need to start "collapsing" incomplete binary nodes if they exist
      return [res.completedNode];
    }
    const completedNodes = (() => {
      if (res.incompleteNode !== undefined) {
        // first range completes this
        // second range becomes it's own node
        // I guess recusion it is
        const [firstNode, ...remainingNodes] =
          buildProgramSequence(res.unprocessedPart as PartialTreeBuild, tokens); //tokens, res .nodeCompletingRange);
        return [res.incompleteNode.finish(firstNode), ...remainingNodes];
      }
      return [];
    })();

    const otherNodes = (() => {
      if (res.remainingPart) {
        return buildProgramSequence(res.remainingPart, tokens);
      }
      return [];
    })();

    return [...completedNodes, ...otherNodes];
  }

  function buildFor(tokens: TokenCollection): AstNode {
    const partBuild = PartialTreeBuild.make(tokens, 0, tokens.count());
    return AstTupleNode.make(buildProgramSequence(partBuild, tokens));
  }

  return Object.freeze({ buildFor });
})();
