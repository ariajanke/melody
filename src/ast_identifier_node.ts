import { Helpers } from './helpers';
import { AstNode } from './ast_node';
import { type AstFringeNode } from './ast_fringe_node';
import { type Token } from './token';
import { type TypeResolution } from './type_resolution';
import { type ContextVariable } from './context_variable';
import { type TypeLookUpTable } from './ast_node';
import { type AstNodeVisitor } from './ast_node_visitor';
import { OperatorDefinitions } from './operator_definitions';

const { freeze } = Helpers;

export const AstIdentifierNode = (() => {
  const kIndentifier = AstNode.types.identifier;
  const { isAnOperator } = OperatorDefinitions;

  function make(value: string): AstFringeNode {
    const inst = freeze({
      comesBeforeOperator: (operator: Token): boolean =>
        isAnOperator(operator.content()),
      executionType: (types: TypeLookUpTable): TypeResolution =>
        types.lookUpIdentifierType(value),
      evaluate: (getter: (name: string) => ContextVariable): ContextVariable =>
        getter(value),
      type: () => kIndentifier,
      asString: () => value,
      visit: (visitor: AstNodeVisitor): void =>
        visitor.visitIdentifier(inst)
    });
    return inst;
  }

  return freeze({ make });
})();
