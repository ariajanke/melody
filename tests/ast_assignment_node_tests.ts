import { TestHelpers } from './test_helpers';
import { AstAssignmentNode } from '../src/ast_assignment_node';
import { AstNode, AstNodeType, AstNodeVisitor } from '../src/ast_node';
import { AstIdentifierNode } from '../src/ast_stringable_node';
import { AstTupleNode } from '../src/ast_tuple_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstAssignmentNode }, () => {
  const { make } = AstAssignmentNode;
  const makeIdentifier = AstIdentifierNode.make;
  // assignment node represents (for now) this: ':='
  // sort of meaning "set lhs (an identifier) to the rhs's string content" for
  // the program's current context
  it('is reachable by visitor', () => {
    let mustBeTrue = false;
    const visitor = AstNodeVisitor.makeFakeVisitor({
      visitAssignment: (_: AstNode, _1: AstNode) => {
        mustBeTrue = true;
      }
    });
    make(makeIdentifier(''), makeIdentifier('')).visit(visitor);
    expect(mustBeTrue).toBeTruthy();
  });

  it('reports self as an assignment node type', () => {
    const type = make(makeIdentifier(''), makeIdentifier('')).type();
    expect(type).toEqual(AstNodeType.assignment);
  });

  it('maybe visited for assigee name', () => {
    let assigneeName = '';
    const visitor = AstNodeVisitor.makeFakeVisitor({
      visitAssignment: (node: AstAssignmentNode, _: AstNode) => {
        assigneeName = node.assigneeName();
      }
    });
    make(makeIdentifier('foo'), makeIdentifier('')).visit(visitor);
    expect(assigneeName).toEqual('foo');
  });

  it('throws exception on attempt to instantiate with non-stringable node', () => {
    const tuple = AstTupleNode.make([]);
    expect(() => {
      make(tuple, makeIdentifier(''));
    }).toThrowError();
  });

  // so far, the *only* type that exist is the string
});
