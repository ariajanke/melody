import { Helpers } from '../helpers';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { type ObjectTypeResolution } from '../object_type_resolution';
import { ObjectLookUpTable } from '../object_look_up_table';

const { freeze } = Helpers;

const { type, hasCreated } = AstNode.makeTypeClassMethods();

export const AstFunctionDefinitionNode = freeze({
  type,
  hasCreated,
  make: (mSubExpressions: AstNode[]) => {
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFunctionDefinition(inst, mSubExpressions),
      type,
      executionType: (typeTable: ObjectLookUpTable): ObjectTypeResolution =>
        typeTable.lookUpByName('Function'),
      count: () => mSubExpressions.length,
      asString: () => `<fn def>`
    });
    return inst;
  }
});

export type AstFunctionDefinitionNode = ReturnType<typeof AstFunctionDefinitionNode.make>;
