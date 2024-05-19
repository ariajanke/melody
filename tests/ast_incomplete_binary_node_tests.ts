import { TestHelpers } from './test_helpers';
import { AstIncompleteBinaryNode } from '../src/ast_incomplete_binary_node';
import { AstNodeType } from '../src/ast_node';
import { AstIdentifierNode } from '../src/ast_stringable_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstIncompleteBinaryNode }, () => {
  const { makeForOperator } = AstIncompleteBinaryNode;

  function makeAnyNode() {
    return AstIdentifierNode.make('');
  }

  function makeForOperatorWithAnyNodes(operator: string) {
    return makeForOperator(operator, makeAnyNode()).finish(makeAnyNode());
  }

  it('defers creation of a function call', () => {
    const createdType = makeForOperatorWithAnyNodes('(').type();
    expect(createdType).toEqual(AstNodeType.functionCall);
  });

  it('defers creation of a tuple', () => {
    const createdType = makeForOperatorWithAnyNodes(',').type();
    expect(createdType).toEqual(AstNodeType.tuple);
  });

  it('defers creation of an assignment', () => {
    const createdType = makeForOperatorWithAnyNodes(':=').type();
    expect(createdType).toEqual(AstNodeType.assignment);
  });
});
