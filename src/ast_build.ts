import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardError } from './helpers';

export const AstBuild = (() => {
  const { freeze } = Object;

  // function make(mTokens: TokenCollection) {
  //   function buildProgramSequence
  //     (partBuild: PartialTreeBuild): AstNode[]
  //   {
  //     const res = partBuild.buildPart();
  //     if (res === undefined) {
  //       throw Error(( partBuild.error() as StandardError ).message);
  //     }
  //     const withCompleteNode = (...nodes: AstNode[]) =>
  //       res.completedNode ? [res.completedNode, ...nodes] : nodes;

  //     const handleUnprocessedPart = (): AstNode[] => {
  //       if (res.incompleteNode) {
  //         const [head, ...tail] =
  //           buildProgramSequence(res.unprocessedPart as PartialTreeBuild, tokens);
          
  //         return [res.incompleteNode.finish(head), ...tail];
  //       } else if(res.unprocessedPart) {
  //         return buildProgramSequence(res.unprocessedPart);
  //       }
  //       return [];
  //     };

  //     const handleRemainingPart = (): AstNode[] => {
  //       if (res.remainingPart) {
  //         return buildProgramSequence(res.remainingPart);
  //       }
  //       return [];
  //     };

  //     return withCompleteNode(...handleUnprocessedPart(), ...handleRemainingPart());
  //   }
  // }

  const mErrors: StandardError[] = [];

  function buildProgramSequence
    (partBuild: PartialTreeBuild): Readonly<AstNode[]>
  {
    const part = partBuild.buildPart();
    if (!part) {
      mErrors.push(partBuild.error() as StandardError);
      return [];
    }
    return part.expandIntoNodes(buildProgramSequence);
  }

  // function buildProgramSequence
  //   (partBuild: PartialTreeBuild): AstNode[]
  // {
  //   const res = partBuild.buildPart();
  //   if (res === undefined) {
  //     throw Error(( partBuild.error() as StandardError ).message);
  //   }
  //   const withCompleteNode = (...nodes: AstNode[]) =>
  //     res.completedNode ? [res.completedNode, ...nodes] : nodes;

  //   const handleUnprocessedPart = (): AstNode[] => {
  //     if (res.incompleteNode) {
  //       const [head, ...tail] =
  //         buildProgramSequence(res.unprocessedPart as PartialTreeBuild);
        
  //       return [res.incompleteNode.finish(head), ...tail];
  //     } else if(res.unprocessedPart) {
  //       return buildProgramSequence(res.unprocessedPart);
  //     }
  //     return [];
  //   };

  //   const handleRemainingPart = (): AstNode[] => {
  //     if (res.remainingPart) {
  //       return buildProgramSequence(res.remainingPart);
  //     }
  //     return [];
  //   };

  //   return withCompleteNode(...handleUnprocessedPart(), ...handleRemainingPart());
  // }

  function buildFor(tokens: TokenCollection): AstNode {
    const partBuild = PartialTreeBuild.make(tokens, 0, tokens.count());
    const res = buildProgramSequence(partBuild).map(n => n);
    return AstTupleNode.make(res);//buildProgramSequence(partBuild));
  }

  return freeze({ buildFor });
})();
