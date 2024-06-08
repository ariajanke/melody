import { AstNode, type TypeLookUpTable } from './ast_node';
import { Helpers } from './helpers';
import { IncompleteNode } from './ast_incomplete_binary_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { type TypeResolution } from './type_resolution';

type UnaryNodeCreationFn = (node: AstNode) => AstNode;

const { freeze } = Helpers;

export interface AstLetDeclarationNode extends AstNode {};

export const AstLetDeclarationNode = freeze({
  make: (node: AstNode): AstNode => {
    const { executionType } = node;
    const { letDeclaration } = AstNode.types;

    const inst = freeze({
      visit: (visitor: AstNodeVisitor) => {
        visitor.visitLetDeclaration(inst, node);
      },
      type: () => letDeclaration,
      executionType: (types: TypeLookUpTable): TypeResolution => {
        // I need to "dress up" the type look up table
        // so that I can give lhs identifier node permission to not yet exist
        return executionType(types);
      }
    });

    return inst;
  }
});

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

  return freeze({ makeForOperator });
})();
