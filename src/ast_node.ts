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

  let sStringTable: undefined | Readonly<{ [type: symbol]: string }> = undefined;

  const class_ = freeze({
    base: {
      makeUndefinedExecutionType
    },
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
        functionCall: Symbol(),
        tuple: Symbol(),
        stringLiteral: Symbol(),
        identifier: Symbol(),
        letDeclaration: Symbol(),
        binaryOperator: Symbol(),
        integerLiteral: Symbol()
      }
    });
  
  
  return class_;
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
