import { Helpers } from './helpers';
import { AstNode } from './ast_node';
import { PartialBuildToNodesFn, NodeExpansionVisitor, NodeExpansion } from './node_expansion';
import { PartialTreeBuild } from './partial_tree_build';

const { freeze } = Helpers;

export interface RightTreePartHandler {
  handleRightSide: (fn: PartialBuildToNodesFn) => Readonly<AstNode[]>,
  visit: (node: AstNode, visitor: NodeExpansionVisitor) => void
}

export const BareRightTreePartHandler = (() => {
  function make(): RightTreePartHandler {
    function handleRightSide
      (_0: PartialBuildToNodesFn): Readonly<AstNode[]>
    { return []; }

    function visit(node: AstNode, visitor: NodeExpansionVisitor)
      { visitor.visitRightNodeOnly(node); }

    return freeze({ handleRightSide, visit });
  }

  return freeze({ make });
})();

export const BuildPartRightTreePartHandler = (() => {
  function make(rightPart: PartialTreeBuild): RightTreePartHandler {

    function handleRightSide(fn: PartialBuildToNodesFn): Readonly<AstNode[]>
      { return fn(rightPart); }

    function visit(node: AstNode, visitor: NodeExpansionVisitor)
      { visitor.visitRightWithPart(node, rightPart); }

    return freeze({ handleRightSide, visit });
  }

  return freeze({ make });
})();

export const RightSideNodeExpansion = (() => {
  function make(node: AstNode, rightHandler: RightTreePartHandler): NodeExpansion {
    const { type, verifyInTesting } = NodeExpansion.makeBase();

    function expandIntoNodes(fn: PartialBuildToNodesFn): Readonly<AstNode[]> {
      return [
        node,
        ...rightHandler.handleRightSide(fn),
      ];
    }

    function visit(visitor: NodeExpansionVisitor) {
      verifyInTesting();
      rightHandler.visit(node, visitor);
    }

    return freeze({ type, expandIntoNodes, visit });
  }

  return freeze({ make });
})();
