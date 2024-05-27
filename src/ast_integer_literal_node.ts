import { AstEvaluatableNode, AstNode, AstNodeVisitor, TypeLookUpTable } from './ast_node';
import { ContextVariable } from './context_variable';
import { ExecutionContext } from './execution_context';
import { Helpers } from './helpers';
import { ObjectLookUpTable, ObjectType } from './type_system';

const { freeze } = Helpers;

export interface AstIntegerLiteralNode extends AstEvaluatableNode {}

export const AstIntegerLiteralNode = (() => {
  const kIntType = AstNode.types.integerLiteral;
  
  function make(value: string): AstIntegerLiteralNode {
    return construct(Number.parseInt(value));
  }

  function construct(mValue: number): AstIntegerLiteralNode {
    return freeze({ 
      visit: (_0: AstNodeVisitor) => {},
      type: (): symbol => kIntType,
      executionType: (_0: TypeLookUpTable): ObjectType =>
        ObjectLookUpTable.kBuiltinTypes.Integer,
      evaluate: (_0: ExecutionContext): ContextVariable =>
        ContextVariable.make(mValue)
    });
  }

  return freeze({ make });
})();
