import { AstNode, AstNodeVisitor } from './ast_node';
import { Helpers } from './helpers';
import { IncompleteNode } from './ast_incomplete_binary_node';

type UnaryNodeCreationFn = (node: AstNode) => AstNode;

const { freeze } = Helpers;

export interface AstLetDeclarationNode {};

export const AstLetDeclarationNode = (() => {
  function make(node: AstNode): AstNode {
    const { executionType } = node;
    const inst = freeze({ visit, type, executionType });
    const { letDeclaration } = AstNode.types;

    function visit(visitor: AstNodeVisitor) {
      visitor.visitLetDeclaration(inst, node);
    }

    function type(): symbol { return letDeclaration; }

    return inst;
  }

  return freeze({ make });
})();

export const AstIncompleteUnaryNode = (() => {
  function _selectedConstructor(operatorStr: string) {
    switch (operatorStr) {
    case 'let':
      return AstLetDeclarationNode.make;
    default: break;
    }
    throw Error(`Token ${operatorStr} does not result in an unary operator`);
  }

  function makeForOperator(operatorStr: string): IncompleteNode {
    return make(_selectedConstructor(operatorStr));
  }

  function make(fn: UnaryNodeCreationFn): IncompleteNode {
    return freeze({ finish: fn });
  }

  return freeze({ makeForOperator, make });
})();
