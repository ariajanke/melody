import { AstNode } from './ast_node';
// import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { AstLiteralNode } from './ast_fringe_node';
import { Token } from './token';
import { AstNodeVisitor } from './ast_node_visitor';
import { type ObjectTypeResolution } from './object_type_resolution';
import { ObjectLookUpTable } from './object_look_up_table';
import { type StringPool } from './context_type';

const { freeze, memoize } = Helpers;

interface AstIntegerLiteralNode extends AstLiteralNode {}

export const AstIntegerLiteralNode = (() => {
  const { hasCreated, type } = AstNode.makeTypeClassMethods();

  function make(value: string): AstLiteralNode {
    return construct(Number.parseInt(value));
  }

  function construct(mValue: number): AstLiteralNode {
    // const eval_ = memoize(() => ContextVariable.make(mValue));
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitLiteral(inst),
      type,
      executionType: (types: ObjectLookUpTable): ObjectTypeResolution =>
        types.lookUpByName('Integer'),
      // evaluate: (_0: (name: string) => ContextVariable): ContextVariable =>
      //   eval_(),
      asString: (): string => `${mValue}`,
      value: (_0: StringPool) => mValue, //memoize(() => ContextVariable.make(mValue)),
      comesBeforeOperator: (operator: Token): boolean => {
        switch (operator.content()) {
        case ',': case '+': case '-': case '*':
          return true;
        default: return false;
        }
      }
    });
    return inst;
  }

  return freeze({ make, type, hasCreated });
})();
