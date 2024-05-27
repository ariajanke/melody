import { AstEvaluatableNode, AstNode, AstNodeVisitor, TypeLookUpTable } from './ast_node';
import { ContextVariable } from './context_variable';
// import { ExecutionContext } from './execution_context';
import { Helpers } from './helpers';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';

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
        ObjectLookUpTable.getBuiltinTypes().Integer,
      evaluate: (_0: (name: string) => ContextVariable): ContextVariable =>
        ContextVariable.make(mValue)
    });
  }

  return freeze({ make });
})();
