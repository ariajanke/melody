import { Helpers } from './helpers';
import { AstNode, ContextualLookUpTable } from './ast_node';
import { type AstFringeNode } from './ast_fringe_node';
import { type Token } from './token';
import { type ContextVariable } from './context_variable';
import { type AstNodeVisitor } from './ast_node_visitor';
import { OperatorDefinitions } from './operator_definitions';
import { type ObjectTypeResolution } from './object_type_resolution';

const { freeze } = Helpers;

export const AstIdentifierNode = (() => {
  const kIndentifier = AstNode.types.identifier;
  const { isAnOperator } = OperatorDefinitions;

  function make(value: string): AstFringeNode {
    const inst = freeze({
      comesBeforeOperator: (operator: Token): boolean =>
        isAnOperator(operator.content()),
      executionType: (types: ContextualLookUpTable): ObjectTypeResolution =>
        types.lookUpIdentifierType(value),
      evaluate: (getter: (name: string) => ContextVariable): ContextVariable =>
        getter(value),
      type: () => kIndentifier,
      asString: () => value,
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitIdentifier(inst)
    });
    return inst;
  }

  return freeze({ make });
})();
