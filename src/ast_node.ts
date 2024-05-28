import { AstFunctionCallNode } from './ast_function_call_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { AstFringeNode } from './ast_fringe_node';

const { freeze } = Helpers;

export interface TypeLookUpTable {
  lookUpIdentifierType: (identifierName: string) => ObjectType
}

export interface AstNode {
  visit: (visitor: AstNodeVisitor) => void,
  type: () => symbol,
  executionType: (types: TypeLookUpTable) => ObjectType
}

export const AstNode = (() => {
  const executionTypes = ContextVariable.types;

  function makeUndefinedExecutionType(nodeTypeName: string):
    (_0: TypeLookUpTable) => ObjectType
  {
    return (_0: TypeLookUpTable): ObjectType => {
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

export interface AstNodeVisitor {
  visitFunctionCall: (node: AstFunctionCallNode) => void,
  visitBinaryOperation: (operation: string, lhs: AstNode, rhs: AstNode) => void,
  visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode) => void,
  visitIdentifier: (node: AstFringeNode) => void
}

export const AstNodeVisitor = (() => {
  const kDefaultImplementations = freeze({
    visitBinaryOperation:
      (_0: string, _1: AstNode, _2: AstNode): void => {},
    visitFunctionCall: (_0: AstFunctionCallNode): void => {},
    visitLetDeclaration: (_0: AstLetDeclarationNode): void => {},
    visitIdentifier: (_0: AstFringeNode): void => {}
  });

  function makeFakeVisitor
    ({
      visitBinaryOperation,
      visitFunctionCall,
      visitLetDeclaration,
      visitIdentifier
    }: {
      visitFunctionCall?: (node: AstFunctionCallNode) => void | undefined,
      visitBinaryOperation?: (op: string, node: AstNode, rhs: AstNode) => void | undefined,
      visitLetDeclaration?: (node: AstLetDeclarationNode) => void | undefined,
      visitIdentifier?: typeof kDefaultImplementations.visitIdentifier
    }): AstNodeVisitor
  {
    const defaults = kDefaultImplementations;
    return freeze({
      visitBinaryOperation: visitBinaryOperation ?? defaults.visitBinaryOperation,
      visitFunctionCall: visitFunctionCall ?? defaults.visitFunctionCall,
      visitLetDeclaration: visitLetDeclaration ?? defaults.visitLetDeclaration,
      visitIdentifier: visitIdentifier ?? defaults.visitIdentifier
    });
  }

  return freeze({ makeFakeVisitor });
})();

// export interface AstLetNode extends AstNode {
//   takenNames: () => string[],
//   primaryName: () => string
// };
