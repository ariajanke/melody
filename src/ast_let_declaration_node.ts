import { AstNode, type TypeLookUpTable } from './ast_node';
import { Helpers } from './helpers';
import { AstNodeVisitor } from './ast_node_visitor';
import { type TypeResolution } from './type_resolution';

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
      },
      asString: () => `let ${node.asString()}...`
    });

    return inst;
  }
});
