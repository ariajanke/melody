import { TreePartBuild } from './tree_part_build';
import {
  NodeExpansion,
  NodeExpansionVisitor,
  PartialBuildToNodesFn
} from './node_expansion';
import { IncompleteNode } from './ast_incomplete_binary_node';
import { AstNode } from './ast_node';

export interface LeftTreePartHandler {
  handleLeftSide: (nodes: Readonly<AstNode[]>) => Readonly<AstNode[]>,
  visit: (leftPart: TreePartBuild, visitor: NodeExpansionVisitor) => void
}

export const BareLeftTreePartHandler = (() => {
  const { freeze } = Object;
  const kSharedInst = freeze({ handleLeftSide, visit });

  function handleLeftSide(nodes: Readonly<AstNode[]>): Readonly<AstNode[]>
    { return nodes; }

  function visit(leftPart: TreePartBuild, visitor: NodeExpansionVisitor)
    { visitor.visitLeftPartOnly(leftPart); }

  function make(): LeftTreePartHandler { return kSharedInst; }

  return freeze({ make });
})();

export const IncompleteNodeLeftTreePartHandler = (() => {
  const { freeze } = Object;

  function make(incompleteNode: IncompleteNode): LeftTreePartHandler {
    function handleLeftSide(nodes: Readonly<AstNode[]>): Readonly<AstNode[]> {
      const [head, ...tail] = nodes;
      if (!head) {
        return [];
      }

      return [incompleteNode.finish(head), ...tail];
    }

    function visit(leftPart: TreePartBuild, visitor: NodeExpansionVisitor)
      { visitor.visitLeftWithNode(incompleteNode, leftPart); }

    return freeze({ handleLeftSide, visit });
  }

  return freeze({ make });
})();

export const LeftSideNodeExpansion = (() => {
  const { freeze } = Object;

  function make
    (leftPartHandler: LeftTreePartHandler,
     leftPart: TreePartBuild,
     rightPart: TreePartBuild): NodeExpansion
  {
    const {
      type, verifyInTesting
    } = NodeExpansion.makeBase();

    function expandIntoNodes
      (fn: PartialBuildToNodesFn): Readonly<AstNode[]>
    {
      return [
        ...leftPartHandler.handleLeftSide(fn(leftPart)),
        ...fn(rightPart)
      ];
    }

    function visit(visitor: NodeExpansionVisitor) {
      verifyInTesting();
      leftPartHandler.visit(leftPart, visitor);
      visitor.
        visitRightPartOnly(rightPart);
    }

    return freeze({ expandIntoNodes, type, visit });
  }

  return freeze({ make });
})();
