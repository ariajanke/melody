import { AstNode } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardError } from './helpers';

export const AstBuild = (() => {
  const { freeze } = Object;

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

  function buildFor(tokens: TokenCollection): AstNode {
    const partBuild = PartialTreeBuild.make(tokens, 0, tokens.count());
    const res = buildProgramSequence(partBuild).map(n => n);
    return AstTupleNode.make(res);
  }

  return freeze({ buildFor, testable: { buildProgramSequence } });
})();
