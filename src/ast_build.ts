import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { LineContinuationScheme, PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { Helpers } from './helpers';
import { TokenRange } from './token_range';

export const AstBuild = (() => {
  const { freeze } = Helpers;

  const mErrors: Readonly<{ message: string }>[] = [];

  function buildProgramSequence
    (partBuild: PartialTreeBuild): Readonly<AstNode[]>
  {
    const part = partBuild.buildPart();
    if (!part) {
      mErrors.push(partBuild.error() as Readonly<{ message: string }>);
      return [];
    }
    return part.expandIntoNodes(buildProgramSequence);
  }

  function buildFor(tokens: TokenCollection): AstNode {
    const range = TokenRange.makeStartingRange(tokens);
    const partBuild = PartialTreeBuild.
      make(range, LineContinuationScheme.normal);
    const res = buildProgramSequence(partBuild).map(n => n);
    return AstTupleNode.make(res);
  }

  return freeze({ buildFor, testable: { buildProgramSequence } });
})();
