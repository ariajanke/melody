import { Helpers } from './helpers';
import { AstStringableNode } from './ast_stringable_node';
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

    function visitFunctionCall(_: AstFunctionCallNode): void {}
    function visitAssignment(_: AstAssignmentNode, _1: AstNode): void {}
    function visitLetDeclaration(_: AstNode): void {}

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
    })
  }

  return freeze({ makeFakeVisitor });
})();

export interface AstLetNode extends AstNode {
  takenNames: () => string[],
  primaryName: () => string
};

// export const AstLetNode = (() => {
//   const { freeze } = Object;
//   function takenNamesFor(name: string): string[] {
//     return [];
//   }

//   function make
//     (declaring: AstStringableNode, assignmentOperator: AstNode): AstLetNode
//   {
//     const { memoize } = Helpers;
//     const mPrimaryName = declaring.asString();
//     const takenNames = memoize(() => takenNamesFor(mPrimaryName));
//     const inst = freeze({ visit, type, takenNames, primaryName });

//     function visit(visitor: AstNodeVisitor): void {
//       visitor.visitLetDeclaration(inst);
//     }

//     function type() { return AstNodeType.letDeclaration; }

//     function primaryName() { return mPrimaryName; }

//     return inst;
//   }

//   return freeze({ make });
// })();

// Assignment is a special case of binary operator
const AstAssignmentOperatorNode = (() => {
  const { freeze } = Object;

  function makeReadOnly(lhs: AstNode, rhs: AstNode) {
    return construct(false, lhs, rhs);
  }

  function makeWritable(lhs: AstNode, rhs: AstNode) {
    return construct(true, lhs, rhs);
  }

  function construct(mIsReassignable: boolean, lhs: AstNode, rhs: AstNode) {
    if (lhs.type() !== AstNodeType.identifier) {
      return freeze({ message: `Only identifiers allowed on left hand side of assignment` });
    }

    // rhs needs to be evaluatable, and have an evaluatable type
  }

  return freeze({ makeReadOnly, makeWritable });
})();
