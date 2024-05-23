import { AstNode, AstNodeVisitor } from './ast_node';
import { AstStringableNode } from './ast_stringable_node';

export interface AstAssignmentNode extends AstNode {
  assigneeName: () => string
}

export const AstAssignmentNode = (() => {
  const { freeze } = Object;
  const assignmentType = AstNode.types.assignment;

  // for rhs, I'm now entering the domain of evaluating expressions
  // as such time to read up then?

  function make(lhs: AstNode, rhs: AstNode): AstAssignmentNode {
    const { asString } = AstStringableNode.downcast(lhs);
    const inst = freeze({ visit, type, assigneeName: asString });

    function visit(visitor: AstNodeVisitor) {
      visitor.visitAssignment(inst, rhs);
    }

    function type(): symbol {
      return assignmentType;
    }

    return inst;
  }

  return freeze({ make });
})();
