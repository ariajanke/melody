import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { type TypeResolution } from './type_resolution';
import { type AstNodeVisitor } from './ast_node_visitor';

const { freeze } = Helpers;

export interface TypeLookUpTable {
  lookUpIdentifierType: (identifierName: string) => TypeResolution,
  lookUpStringLiteralType: () => TypeResolution,
  lookUpIntegerLiteralType: () => TypeResolution
}

export interface AstNode {
  visit: (visitor: AstNodeVisitor) => void,
  type: () => symbol,
  // I should first probably fix this...
  // this could fail, in which case you'd have Either an ObjectType or an Error
  executionType: (types: TypeLookUpTable) => TypeResolution
}

export const AstNode = (() => {
  const executionTypes = ContextVariable.types;

  function makeUndefinedExecutionType(nodeTypeName: string):
    (_0: TypeLookUpTable) => TypeResolution
  {
    return (_0: TypeLookUpTable): TypeResolution => {
      throw Error(`${nodeTypeName} does not implement executionType`);
    };
  }

  return freeze({
    base: {
      makeUndefinedExecutionType
    },
    executionTypes,
    types:
      {
        functionCall: Symbol(),
        tuple: Symbol(),
        stringLiteral: Symbol(),
        identifier: Symbol(),
        letDeclaration: Symbol(),
        binaryOperator: Symbol(),
        integerLiteral: Symbol()
      }
    });
})();

export interface AstEvaluatableNode extends AstNode {
  evaluate: (getter: (name: string) => ContextVariable) => ContextVariable
}

export const AstEvaluatableNode = (() => {
  const { stringLiteral, identifier, integerLiteral } = AstNode.types;

  return freeze({
    tryDowncast: (node: AstNode): AstEvaluatableNode | undefined => {
      switch (node.type()) {
      case stringLiteral:
      case identifier:
      case integerLiteral:
        return node as AstEvaluatableNode;
      default: return undefined;
      }
    }
  });
})();
