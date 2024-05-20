import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardError } from './helpers';

export const AstBuild = (() => {
  function buildProgramSequence
    (partBuild: PartialTreeBuild, tokens: TokenCollection):
    AstNode[]
  {
    const res = partBuild.buildPart();
    if (res === undefined) {
      throw Error(( partBuild.error() as StandardError ).message);
    }
    const withCompleteNode = (...nodes: AstNode[]) =>
      res.completedNode ? [res.completedNode, ...nodes] : nodes;

    const handleUnprocessedPart = (): AstNode[] => {
      if (res.incompleteNode) {
        const [head, ...tail] =
          buildProgramSequence(res.unprocessedPart as PartialTreeBuild, tokens);
        
        return [res.incompleteNode.finish(head), ...tail];
      } else if(res.unprocessedPart) {
        return buildProgramSequence(res.unprocessedPart, tokens);
      }
      return [];
    };

    const handleRemainingPart = (): AstNode[] => {
      if (res.remainingPart) {
        return buildProgramSequence(res.remainingPart, tokens);
      }
      return [];
    };

    return withCompleteNode(...handleUnprocessedPart(), ...handleRemainingPart());
  }

  function buildFor(tokens: TokenCollection): AstNode {
    const partBuild = PartialTreeBuild.make(tokens, 0, tokens.count());
    return AstTupleNode.make(buildProgramSequence(partBuild, tokens));
  }

  return Object.freeze({ buildFor });
})();
