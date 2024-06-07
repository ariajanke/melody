import { AstNodeVisitor, AstNode } from './ast_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstFringeNode } from './ast_fringe_node';
import { Helpers } from './helpers';


const { freeze } = Helpers;

const AstValidatorVisitor = freeze({
  make: (): AstNodeVisitor => {
    return freeze({
      visitFunctionCall: (node: AstFunctionCallNode) => {},
      visitBinaryOperation: (operation: string, lhs: AstNode, rhs: AstNode) => {},
      // as of yet, there is no concept of "scope"
      visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode) => {},
      visitIdentifier: (node: AstFringeNode) => {}
    });
  }
});

export const AstValidator = freeze({
  make: () => {

  }
});