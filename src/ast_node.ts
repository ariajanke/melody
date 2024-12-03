import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { type AstNodeVisitor } from './ast_node_visitor';
import { type ObjectLookUpTable } from './object_look_up_table';
import { type ObjectTypeResolution } from './object_type_resolution';

const { freeze } = Helpers;

export interface ContextualLookUpTable extends ObjectLookUpTable {
  lookUpIdentifierType: (identifierName: string) => ObjectTypeResolution,
  lookUpContextType: () => ObjectTypeResolution
}

export interface AstNode {
  visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>) =>
    AccumulationType,
  type: () => symbol,
  executionType: (types: ContextualLookUpTable) => ObjectTypeResolution,
  asString: () => string
}

export const AstNode = (() => {
  const executionTypes = ContextVariable.types;

  let sStringTable: undefined | Readonly<{ [type: symbol]: string }> = undefined;

  const class_ = freeze({
    executionTypes,
    typeToString: (type: symbol): string => {
      const str = (sStringTable ??= freeze({
        [class_.types.binaryOperator]: 'binary operator',
        [class_.types.tuple         ]: 'tuple',
        [class_.types.stringLiteral ]: 'string literal',
        [class_.types.identifier    ]: 'identifier',
        [class_.types.letDeclaration]: 'declaration',
        [class_.types.integerLiteral]: 'integer literal'
      }))[type];
      if (str)
        return str;
      throw Error('given symbol is not an AstNode type');
    },
    types:
      {
        functionCall  : Symbol(),
        tuple         : Symbol(),
        stringLiteral : Symbol(),
        identifier    : Symbol(),
        letDeclaration: Symbol(),
        binaryOperator: Symbol(),
        integerLiteral: Symbol(),
        functionDefinition: Symbol()
      }
    });
  
  
  return class_;
})();

export interface AstEvaluatableNode extends AstNode {
  evaluate: (getter: (name: string) => ContextVariable) => ContextVariable
}

export const AstEvaluatableNode = (() => {
  const { stringLiteral, identifier, integerLiteral } = AstNode.types;

  const _forceCastToEvaluatableNode =
    (node: AstNode): AstEvaluatableNode | undefined =>
    node as AstEvaluatableNode;

  const _defaultCase = (_0: AstNode): AstEvaluatableNode | undefined =>
    undefined;

  const kDowncastTable = freeze({
    [stringLiteral ]: _forceCastToEvaluatableNode,
    [identifier    ]: _forceCastToEvaluatableNode,
    [integerLiteral]: _forceCastToEvaluatableNode
  });

  return freeze({
    tryDowncast: (node: AstNode): AstEvaluatableNode | undefined =>
      (kDowncastTable[node.type()] ?? _defaultCase)(node)
  });
})();
