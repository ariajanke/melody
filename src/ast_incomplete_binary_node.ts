import { AstNode } from './ast_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';
import { AstFringeNode } from './ast_fringe_node';
import { Helpers, StandardError } from './helpers';
import { Token } from './token';

const { freeze } = Helpers;

export interface IncompleteNode {
  finish: (rhs: AstNode) => AstNode
}

export interface AstIncompleteBinaryNode extends IncompleteNode {
  lhsAsString: () => string | undefined
}

type BinaryNodeCreationFn = (operatorStr: string, lhs: AstNode, rhs: AstNode) => AstNode;

export const AstIncompleteBinaryNode = (() => {
  function make
    (fn: BinaryNodeCreationFn, operatorStr: string, lhs: AstNode):
    AstIncompleteBinaryNode
  {
    function finish(rhs: AstNode): AstNode {
      return fn(operatorStr, lhs, rhs);
    }

    // defined for testing
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
      case '+':
      case '-':
      case '*':
        return AstBinaryOperatorNode.make;
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

      return AstIncompleteBinaryNode.make( selected, mOperator.content(), mLhs );
    }

    return freeze({ makeNode, error });
  }

  return freeze({ make });
})();
