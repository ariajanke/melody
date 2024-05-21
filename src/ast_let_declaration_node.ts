import { AstNode, AstNodeVisitor } from './ast_node';
import { Helpers } from './helpers';
import { IncompleteNode } from './ast_incomplete_binary_node';

type UnaryNodeCreationFn = (node: AstNode) => AstNode;

const { freeze } = Helpers;

const AstIncompleteUnaryNode = (() => {
  function makeForOperator(operatorStr: string) {
    switch (operatorStr) {
    case 'let':
      return AstLetDeclarationNode.make;
    default: break;
    }
    throw Error(`Token ${operatorStr} does not result in an unary operator`);
  }

  function make(fn: UnaryNodeCreationFn): IncompleteNode {
    return freeze({ finish: fn });
  }

  return freeze({ makeForOperator, make })
})();

const AstLetDeclarationNode = (() => {
  function make() {
    const inst = freeze({ visit, type });
    const { letDeclaration } = AstNode.types;

    function visit(visitor: AstNodeVisitor) {
      visitor.visitLetDeclaration(inst);
    }

    function type(): symbol { return letDeclaration; }

    return inst;
  }

  return freeze({ make });
})();
