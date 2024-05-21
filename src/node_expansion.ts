import { PartialTreeBuild } from './partial_tree_build';
import { AstNode } from './ast_node';
import { Helpers, TypeCheckable } from './helpers';
import { IncompleteNode } from './ast_incomplete_binary_node';

const { freeze } = Helpers;

export type PartialBuildToNodesFn =
  (partBuild: PartialTreeBuild) => Readonly<AstNode[]>;

export interface NodeExpansionVisitor {
  visitIncomplete:
    (incNode: IncompleteNode, completing: PartialTreeBuild) =>
    NodeExpansionVisitor,
  visitComplete:
    (node: AstNode, remaining: PartialTreeBuild) => NodeExpansionVisitor,
  visitRemainingPart: (remainingPart: PartialTreeBuild) => NodeExpansionVisitor
}

export interface NodeExpansion extends TypeCheckable {
  expandIntoNodes: (partBuildToNodes: PartialBuildToNodesFn) =>
    Readonly<AstNode[]>,
  visit: (visitor: NodeExpansionVisitor) => void
}

export const NodeExpansion = (() => {
  const { freeze, kInTestEnvironment } = Helpers;

  function visit(_0: NodeExpansionVisitor) {}

  function verifyInTesting() {
    if (kInTestEnvironment) return;
    throw Error('Cannot be called outside of a testing environment');
  }

  function makeBase() {
    const { type, hasCreated } = TypeCheckable.make();

    return freeze({ hasCreated, type, freeze, visit, verifyInTesting });
  }

  return freeze({ makeBase });
})();

export const EmptyNodeExpansion = (() => {
  const { type, hasCreated, visit } = NodeExpansion.makeBase();
  const kEmpty: Readonly<AstNode[]> = [];

  function expandIntoNodes
    (_0: PartialBuildToNodesFn): Readonly<AstNode[]>
  { return kEmpty; }

  const sharedInst = freeze({
    expandIntoNodes,
    type,
    visit
  });

  function make(): NodeExpansion {
    return sharedInst;
  }

  return freeze({ make, hasCreated });
})();
