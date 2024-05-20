import { AstFunctionCallNode } from './ast_function_call_node';
import { AstAssignmentNode } from './ast_assignment_node';

export interface AstNode {
  visit: (visitor: AstNodeVisitor) => void,
  type: () => symbol
}

export const AstNodeType = Object.freeze({
  functionCall: Symbol(),
  tuple: Symbol(),
  stringLiteral: Symbol(),
  identifier: Symbol(),
  letDeclaration: Symbol(),
  assignment: Symbol()
});

export interface AstNodeVisitor {
  visitFunctionCall: (node: AstFunctionCallNode) => void,
  visitAssignment: (node: AstAssignmentNode, lhs: AstNode) => void,
  visitLetDeclaration: (node: AstNode) => void
}

export const AstNodeVisitor = (() => {
  const { freeze } = Object;
  const kDefaultImplementations = (() => {

    function visitFunctionCall(_0: AstFunctionCallNode): void {}
    function visitAssignment(_0: AstAssignmentNode, _1: AstNode): void {}
    function visitLetDeclaration(_0: AstNode): void {}

    return freeze({ visitAssignment, visitFunctionCall, visitLetDeclaration });
  })();

  function makeFakeVisitor
    ({
      visitAssignment,
      visitFunctionCall,
      visitLetDeclaration
    }: {
      visitFunctionCall?: (node: AstFunctionCallNode) => void | undefined,
      visitAssignment?: (node: AstAssignmentNode, rhs: AstNode) => void | undefined,
      visitLetDeclaration?: (node: AstNode) => void | undefined
    }): AstNodeVisitor
  {
    const defaults = kDefaultImplementations;
    return freeze({
      visitAssignment: visitAssignment ?? defaults.visitAssignment,
      visitFunctionCall: visitFunctionCall ?? defaults.visitFunctionCall,
      visitLetDeclaration: visitLetDeclaration ?? defaults.visitLetDeclaration
    });
  }

  return freeze({ makeFakeVisitor });
})();

export interface AstLetNode extends AstNode {
  takenNames: () => string[],
  primaryName: () => string
};
