import { AstNode } from './ast_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstAssignmentNode } from './ast_assignment_node';
import { AstStringableNode } from './ast_stringable_node';
import { Helpers, StandardError } from './helpers';
import { Token } from './token';

const { freeze } = Helpers;

export interface IncompleteNode {
  finish: (rhs: AstNode) => AstNode
}

export interface AstIncompleteBinaryNode extends IncompleteNode {
  lhsAsString: () => string | undefined
}

type BinaryNodeCreationFn = (lhs: AstNode, rhs: AstNode) => AstNode;

export const AstIncompleteBinaryNode = (() => {
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

  return freeze({ make });
})();

export const IncompleteNodeCreation = (() => {
  const { error, setErrorMessage } = StandardError.make();

  function make(mOperator: Token, mLhs: AstNode) {
    function _selectedConstructor(): BinaryNodeCreationFn | undefined {
      const tokenStr = mOperator.content();
      switch (tokenStr) {
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
      return setErrorMessage(`Token ${tokenStr} does not result in a binary operator`);
    }

    function makeNode() {
      const selected = _selectedConstructor();
      if (!selected) {
        return;
      }

      return AstIncompleteBinaryNode.make( selected, mLhs );
    }

    return freeze({ makeNode, error });
  }

  return freeze({ make });
})();
