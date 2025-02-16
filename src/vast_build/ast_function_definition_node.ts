import { Helpers } from '../helpers';
import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { type ObjectTypeResolution } from '../object_type_resolution';
import { ObjectLookUpTable } from '../object_look_up_table';

const { freeze, memoize } = Helpers;

const { type, hasCreated } = AstNode.makeTypeClassMethods();

export interface AstFunctionDefinitionNode extends AstNode {
  count(): number
};

export const AstFunctionDefinitionNode = freeze({
  type,
  hasCreated,
  make: (mSubExpressions: AstNode[]): AstFunctionDefinitionNode => {
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFunctionDefinition(inst, mSubExpressions),
      type,
      executionType: (typeTable: ObjectLookUpTable): ObjectTypeResolution =>
        typeTable.lookUpByName('Function'),
      count: () => mSubExpressions.length,
      asString: () => `<fn def>`,
      uid: memoize(Symbol),
      asName: () => undefined
    });
    return inst;
  }
});

