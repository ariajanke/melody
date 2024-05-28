import { AstNode, AstNodeVisitor, TypeLookUpTable } from './ast_node';
import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';
import { AstFringeNode } from './ast_fringe_node';
import { Token } from './token';

const { freeze } = Helpers;

export const AstIntegerLiteralNode = (() => {
  const kIntType = AstNode.types.integerLiteral;

  function make(value: string): AstFringeNode {
    return construct(Number.parseInt(value));
  }

  function construct(mValue: number): AstFringeNode {
    return freeze({
      visit: (_0: AstNodeVisitor) => {},
      type: (): symbol => kIntType,
      executionType: (_0: TypeLookUpTable): ObjectType =>
        ObjectLookUpTable.getBuiltinTypes().Integer,
      evaluate: (_0: (name: string) => ContextVariable): ContextVariable =>
        ContextVariable.make(mValue),
      asString: (): string => `${mValue}`,
      comesBeforeOperator: (operator: Token): boolean => {
        switch (operator.content()) {
        case ',': case '+': case '-': case '*':
          return true;
        default: return false;
        }
      }
    });
  }

  return freeze({ make });
})();
