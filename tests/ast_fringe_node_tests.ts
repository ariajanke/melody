import { AstFringeNode, AstIdentifierNode } from '../src/ast_fringe_node';
import { TestHelpers } from './test_helpers';
import { Token } from '../src/token';

const { describeNamed } = TestHelpers;

describeNamed({ AstFringeNode }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;
  it('may come before a "+" operator', () => {
    const node = AstIdentifierNode.make('a');
    expect(node.comesBeforeOperator(makeToken('+'))).toBeTruthy();
  });
});
