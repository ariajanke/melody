import { AstNode } from './ast_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstAssignmentNode } from './ast_assignment_node';
import { AstStringableNode } from './ast_stringable_node';

export interface IncompleteNode {
  finish: (rhs: AstNode) => AstNode
}

export interface AstIncompleteBinaryNode extends IncompleteNode {
  lhsAsString: () => string | undefined
}

export const AstIncompleteBinaryNode = (() => {
  type BinaryNodeCreationFn = (lhs: AstNode, rhs: AstNode) => AstNode;
  const { freeze } = Object;

  function _selectedConstructor(operatorStr: string): BinaryNodeCreationFn {
    switch (operatorStr) {
    case '(':
      return AstFunctionCallNode.make;
    case ',':
    case '\n':
      return AstTupleNode.makeBinary;
    case ':=':
      return AstAssignmentNode.make;
    // +, -, *, /, and, or, =, [, .,
    // +=, -=, *=, /=
    default: break;
    }
    throw Error(`Token ${operatorStr} does not result in a binary operator`);
  }

  function makeForOperator(operatorStr: string, lhs: AstNode) {
    const fn = _selectedConstructor(operatorStr);
    return make(fn, lhs);
  }

  function make
    (fn: BinaryNodeCreationFn, lhs: AstNode):
    AstIncompleteBinaryNode
  {
    function finish(rhs: AstNode): AstNode {
      return fn(lhs, rhs);
    }

    // defined for testing
    function lhsAsString(): string | undefined {
      if (!AstStringableNode.hasCreated(lhs)) {
        return undefined;
      }
      return AstStringableNode.downcast(lhs).asString();
    }

    return freeze({ finish, lhsAsString });
  }

  return freeze({ make, makeForOperator });
})();
