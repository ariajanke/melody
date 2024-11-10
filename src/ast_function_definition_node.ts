import { Helpers } from './helpers';
import { AstNode, TypeLookUpTable } from './ast_node';
import { TypeResolution } from './type_resolution';
import { AstNodeVisitor } from './ast_node_visitor';

const { freeze } = Helpers;

export const AstFunctionDefinitionNode = freeze({
  nodeType: () => AstNode.types.functionDefinition,
  make: (mSubExpressions: AstNode[]) => {
    const inst = freeze({
      visit: (visitor: AstNodeVisitor) =>
        visitor.visitFunctionDefinition(inst, mSubExpressions),
      type: AstFunctionDefinitionNode.nodeType,
      executionType: (typeTable: TypeLookUpTable): TypeResolution =>
        typeTable.lookUpFunctionType(),
      count: () => mSubExpressions.length,
      asString: () => `<fn def>`
    });
    return inst satisfies AstNode;
  }
});

export type AstFunctionDefinitionNode = ReturnType<typeof AstFunctionDefinitionNode.make>;
