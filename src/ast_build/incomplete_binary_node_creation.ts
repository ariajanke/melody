import { AstFunctionCallNode } from '../ast_function_call_node';
import { AstTupleNode } from '../ast_tuple_node';
import { AstBinaryOperatorNode } from '../ast_binary_operator_node';
import {
  type BinaryNodeCreationFn,
  AstIncompleteBinaryNode
} from '../ast_incomplete_binary_node';
import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { AstNode } from '../ast_node';

const { freeze } = Helpers;

export const IncompleteBinaryNodeCreation = (() => {
  const { error, setErrorMessage } = StandardError.make();

  let sConstructorTable:
    { [content: string]: BinaryNodeCreationFn } | undefined =
    undefined;

  function make(mOperator: Token, mLhs: AstNode) {
    function _selectedConstructor(): BinaryNodeCreationFn | undefined {
      sConstructorTable ??= freeze({
        [','   ]: AstTupleNode         .makeBinary,
        ['\n'  ]: AstTupleNode         .makeBinary,
        [':='  ]: AstBinaryOperatorNode.make,
        ['+'   ]: AstBinaryOperatorNode.make,
        ['-'   ]: AstBinaryOperatorNode.make,
        ['*'   ]: AstBinaryOperatorNode.make,
        // not a keyword
        ['call']: AstFunctionCallNode  .make
      });
      const tokenStr = mOperator.content();
      const selected = sConstructorTable[tokenStr];
      if (selected) { return selected; }
      return setErrorMessage(
        `Token ${tokenStr} does not result in a binary operator`);
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
