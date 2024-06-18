import { TestHelpers } from './test_helpers';
import { AstIncompleteBinaryNode } from '../src/ast_incomplete_binary_node';
import { AstNode } from '../src/ast_node';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { Token } from '../src/token';
import { IncompleteBinaryNodeCreation } from '../src/ast_build/incomplete_binary_node_creation';

const { describeNamed } = TestHelpers;

describeNamed({ AstIncompleteBinaryNode }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;
  const makeForOperator = IncompleteBinaryNodeCreation.make;

  function makeAnyNode() {
    return AstIdentifierNode.make('');
  }

  function makeForOperatorWithAnyNodes(operator: string) {
    return makeForOperator(makeToken(operator), makeAnyNode())?.
      makeNode()?.
      finish(makeAnyNode());
  }

  it('defers creation of a function call', () => {
    const createdType = makeForOperatorWithAnyNodes('call')?.type();
    expect(createdType).toEqual(AstNode.types.functionCall);
  });

  it('defers creation of a tuple', () => {
    const createdType = makeForOperatorWithAnyNodes(',')?.type();
    expect(createdType).toEqual(AstNode.types.tuple);
  });

  it('defers creation of an assignment', () => {
    const createdType = makeForOperatorWithAnyNodes(':=')?.type();
    expect(createdType).toEqual(AstNode.types.binaryOperator);
  });
});
