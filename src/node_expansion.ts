import { PartialTreeBuild } from './partial_tree_build';
import { AstNode } from './ast_node';
import { Helpers, TypeCheckable } from './helpers';
import { IncompleteNode } from './ast_incomplete_binary_node';

const { freeze } = Helpers;

export type PartialBuildToNodesFn =
  (partBuild: PartialTreeBuild) => Readonly<AstNode[]>;

export interface NodeExpansionVisitor {
  visitLeftPartOnly: (leftPart: PartialTreeBuild) => void,
  visitLeftWithNode: (node: IncompleteNode, leftPart: PartialTreeBuild) => void
  visitRightPartOnly: (rightPart: PartialTreeBuild) => void,
  visitRightNodeOnly: (node: AstNode) => void,
  visitRightWithPart: (node: AstNode, rightPart: PartialTreeBuild) => void
}

export const NodeExpansionVisitor = (() => {
  function makeDefaultImplementations(fn: () => void) {
    return freeze({
      visitLeftPartOnly: (_0: PartialTreeBuild) => { fn(); },
      visitLeftWithNode: (_0: IncompleteNode, _1: PartialTreeBuild) =>
        { fn(); },
      visitRightPartOnly: (_0: PartialTreeBuild) => { fn(); },
      visitRightNodeOnly: (_0: AstNode) => { fn(); },
      visitRightWithPart: (_0: AstNode, _1: PartialTreeBuild) =>
        { fn(); }
    });
  }

  function makeOverrider(defaultOnCallback: () => void = () => {}) {
    const mInstance = { ...makeDefaultImplementations(defaultOnCallback) };

    const inst = freeze({
      visitLeftPartOnly,
      visitLeftWithNode,
      visitRightPartOnly,
      visitRightNodeOnly,
      visitRightWithPart,
      finish
    });

    // maybe generics/key enumerations can DRY this up?

    function visitLeftPartOnly(fn: (leftPart: PartialTreeBuild) => void) {
      mInstance.visitLeftPartOnly = fn;
      return inst;
    }

    function visitLeftWithNode(fn: (node: IncompleteNode, leftPart: PartialTreeBuild) => void) {
      mInstance.visitLeftWithNode = fn;
      return inst;
    }

    function visitRightPartOnly(fn: (rightPart: PartialTreeBuild) => void) {
      mInstance.visitRightPartOnly = fn;
      return inst;
    }
    function visitRightNodeOnly(fn: (node: AstNode) => void) {
      mInstance.visitRightNodeOnly = fn;
      return inst;
    }
    function visitRightWithPart(fn: (node: AstNode, rightPart: PartialTreeBuild) => void) {
      mInstance.visitRightWithPart = fn;
      return inst;
    }

    function finish(): NodeExpansionVisitor
      { return freeze(mInstance); }

    return inst;
  }

  return freeze({ makeOverrider });
})();

export interface NodeExpansion extends TypeCheckable {
  expandIntoNodes: (partBuildToNodes: PartialBuildToNodesFn) =>
    Readonly<AstNode[]>,
  visit: (visitor: NodeExpansionVisitor) => void
}

export const NodeExpansion = (() => {
  const { freeze, verifyInTesting } = Helpers;

  function visit(_0: NodeExpansionVisitor) {}

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
