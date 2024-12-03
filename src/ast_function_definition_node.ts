import { Helpers } from './helpers';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { type ObjectTypeResolution } from './object_type_resolution';
import { type ContextualLookUpTable } from './ast_node';

const { freeze } = Helpers;

export const AstFunctionDefinitionNode = freeze({
  nodeType: () => AstNode.types.functionDefinition,
  make: (mSubExpressions: AstNode[]) => {
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFunctionDefinition(inst, mSubExpressions),
      type: AstFunctionDefinitionNode.nodeType,
      executionType: (typeTable: ContextualLookUpTable): ObjectTypeResolution =>
        typeTable.lookUpByName('Function'),
      count: () => mSubExpressions.length,
      asString: () => `<fn def>`
    });
    return inst satisfies AstNode;
  }
});

export type AstFunctionDefinitionNode = ReturnType<typeof AstFunctionDefinitionNode.make>;
