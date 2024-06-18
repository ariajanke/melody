import { AstNode } from './ast_node';
import { AstFringeNode } from './ast_fringe_node';
import { Helpers } from './helpers';

const { freeze } = Helpers;

export interface IncompleteNode {
  finish: (rhs: AstNode) => AstNode
}

export interface AstIncompleteBinaryNode extends IncompleteNode {
  lhsAsString: () => string | undefined
}

export type BinaryNodeCreationFn = (operatorStr: string, lhs: AstNode, rhs: AstNode) => AstNode;

// nice lazy class
export const AstIncompleteBinaryNode = (() => {
  function make
    (fn: BinaryNodeCreationFn, operatorStr: string, lhs: AstNode):
    AstIncompleteBinaryNode
  {
    function finish(rhs: AstNode): AstNode {
      return fn(operatorStr, lhs, rhs);
    }

    function lhsAsString(): string | undefined {
      if (!AstFringeNode.hasCreated(lhs)) {
        return undefined;
      }
      return AstFringeNode.downcast(lhs).asString();
    }

    return freeze({ finish, lhsAsString });
  }

  return freeze({ make });
})();
