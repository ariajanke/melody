import { AstFunctionCallNode } from './ast_function_call_node';
import { AstBinaryOperatorNode } from './ast_binary_operator_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { ContextVariable } from './context_variable';
import { ObjectLookUpTable } from './type_system';

const { freeze } = Object;

export interface AstNode {
  visit: (visitor: AstNodeVisitor) => void,
  type: () => symbol,
  executionType: (objects: ObjectLookUpTable) => symbol
}

export const AstNode = (() => {
  const executionTypes = ContextVariable.types;

  function makeUndefinedExecutionType(nodeTypeName: string):
    (_0: ObjectLookUpTable) => symbol
  {
    return (_0: ObjectLookUpTable): symbol => {
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
        assignment: Symbol(),
        integerLiteral: Symbol()
      }
    });
})();

export interface AstNodeVisitor {
  visitFunctionCall: (node: AstFunctionCallNode) => void,
  // visitAssignment: (node: AstBinaryOperatorNode, lhs: AstNode) => void,
  visitBinaryOperation: (operation: string, lhs: AstNode, rhs: AstNode) => void,
  visitLetDeclaration: (node: AstLetDeclarationNode, rhs: AstNode) => void,
}

export const AstNodeVisitor = (() => {
  const kDefaultImplementations = (() => {

    function visitFunctionCall(_0: AstFunctionCallNode): void {}
    function visitBinaryOperation
      (_0: string, _1: AstBinaryOperatorNode, _2: AstNode): void {}
    function visitLetDeclaration(_0: AstLetDeclarationNode): void {}

    return freeze({ visitBinaryOperation, visitFunctionCall, visitLetDeclaration });
  })();

  function makeFakeVisitor
    ({
      visitBinaryOperation,
      visitFunctionCall,
      visitLetDeclaration
    }: {
      visitFunctionCall?: (node: AstFunctionCallNode) => void | undefined,
      visitBinaryOperation?: (op: string, node: AstBinaryOperatorNode, rhs: AstNode) => void | undefined,
      visitLetDeclaration?: (node: AstLetDeclarationNode) => void | undefined
    }): AstNodeVisitor
  {
    const defaults = kDefaultImplementations;
    return freeze({
      visitBinaryOperation: visitBinaryOperation ?? defaults.visitBinaryOperation,
      visitFunctionCall: visitFunctionCall ?? defaults.visitFunctionCall,
      visitLetDeclaration: visitLetDeclaration ?? defaults.visitLetDeclaration
    });
  }

  return freeze({ makeFakeVisitor });
})();

// export interface AstLetNode extends AstNode {
//   takenNames: () => string[],
//   primaryName: () => string
// };
