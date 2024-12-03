import { AstNode } from './ast_node';
import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { AstFringeNode } from './ast_fringe_node';
import { Token } from './token';
import { AstNodeVisitor } from './ast_node_visitor';
import { type ContextualLookUpTable } from './ast_node';
import { type ObjectTypeResolution } from './object_type_resolution';

const { freeze, memoize } = Helpers;

interface AstIntegerLiteralNode extends AstFringeNode {
  value: () => number
}

export const AstIntegerLiteralNode = (() => {
  const kIntType = AstNode.types.integerLiteral;

  function valueOf(node: AstNode): number {
    if (node.type() !== kIntType) {
      throw Error('Node is not an integer literal');
    }
    return (node as AstIntegerLiteralNode).value();
  }

  function make(value: string): AstFringeNode {
    return construct(Number.parseInt(value));
  }

  function construct(mValue: number): AstFringeNode {
    const eval_ = memoize(() => ContextVariable.make(mValue));
    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitFringe(inst),
      type: (): symbol => kIntType,
      executionType: (types: ContextualLookUpTable): ObjectTypeResolution =>
        types.lookUpByName('Integer'),
      evaluate: (_0: (name: string) => ContextVariable): ContextVariable =>
        eval_(),
      asString: (): string => `${mValue}`,
      comesBeforeOperator: (operator: Token): boolean => {
        switch (operator.content()) {
        case ',': case '+': case '-': case '*':
          return true;
        default: return false;
        }
      },
      value: () => mValue
    });
    return inst;
  }

  return freeze({ make, valueOf });
})();
