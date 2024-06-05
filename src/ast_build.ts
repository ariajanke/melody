import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { LineContinuationScheme, TreePartBuild } from './ast_build/tree_part_build';
import { TokenRange } from './token_range';
import { Helpers } from './helpers';

export const AstBuild = (() => {
  const { freeze } = Helpers;

  const mErrors: Readonly<{ message: string }>[] = [];

  function buildProgramSequence
    (partBuild: TreePartBuild): Readonly<AstNode[]>
  {
    const part = partBuild.buildPart();
    if (!part) {
      mErrors.push(partBuild.error() as Readonly<{ message: string }>);
      return [];
    }
    return part.expandIntoNodes(buildProgramSequence);
  }

  function buildFor(tokens: TokenRange): AstNode {
    const partBuild = TreePartBuild.
      make(tokens, LineContinuationScheme.normal);
    const res = buildProgramSequence(partBuild).map(n => n);
    return AstTupleNode.make(res);
  }

  return freeze({ buildFor, testable: { buildProgramSequence } });
})();
