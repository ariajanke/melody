import { Helpers } from '../helpers';
import { Token } from '../token';
import { AstNode } from '../ast_node';
import { AstTupleNode } from '../ast_tuple_node';
import { AstLetDeclarationNode } from '../ast_let_declaration_node';
import { AstBinaryOperatorNode } from '../ast_binary_operator_node';
import { AstFunctionCallNode } from '../ast_function_call_node';
import { AstFringeNode } from '../ast_fringe_node'; 
import {
  type OperativeStatementVisitable,
  type OperativeStatementVisitor
} from '../operative_statement_builder';

const { freeze } = Helpers;

export interface OperativeStatementAstCreation extends OperativeStatementVisitor {
  finish: () => AstNode
};

export const OperativeStatementAstCreation = freeze({
  make: (): OperativeStatementAstCreation => {
    const mNodeStack: AstNode[] = [];
    const popOrThrow = () => {
      return mNodeStack.pop() ?? (() => { throw new Error('nodes depleted'); })();
    };
    const binaryOperator = (token: Token) => {
      const first = popOrThrow();
      mNodeStack.push(AstBinaryOperatorNode.make(token.content(), popOrThrow(), first));
    };
    const tupleOperator = (token: Token) => {
      const first = popOrThrow();
      const second = popOrThrow();

      if (second.type() === AstNode.types.tuple) {
        (second as AstTupleNode).append(first);
        return mNodeStack.push(second);
      }
      mNodeStack.push(AstTupleNode.makeBinary(token.content(), second, first));
    };
    const letOperator = (_0: Token) => {
      mNodeStack.push(AstLetDeclarationNode.make(popOrThrow()));
    };
    const functionCall = (token: Token) => {
      const first = popOrThrow();
      mNodeStack.push(AstFunctionCallNode.make(token.content(), popOrThrow(), first));
    };
    const mOperatorFactories = {
      ['+'  ]: binaryOperator,
      [','  ]: tupleOperator,
      [':=' ]: binaryOperator,
      ['-'  ]: binaryOperator,
      ['*'  ]: binaryOperator,
      ['let']: letOperator,
      [Token.kCallToken.content()]: functionCall
    };
    const inst = freeze({
      visitToken   : (token: Token) => {
        const opFactory = mOperatorFactories[token.content()];
        if (opFactory) {
          return opFactory(token);
        }
        mNodeStack.push(AstFringeNode.makeForToken(token));
      },
      visitNode    : (node: AstNode) =>
        { mNodeStack.push(node); },
      visitLinks:
        (low: OperativeStatementVisitable,
         node: OperativeStatementVisitable,
         high: OperativeStatementVisitable) =>
      {
        low.visit(inst);
        high.visit(inst);
        node.visit(inst);
      },
      finish: (): AstNode => {
        const node = popOrThrow();
        if (mNodeStack.length !== 0) {
          throw new Error('uh oh');
        }
        return node;
      }
    });
    return inst;
  }
});
