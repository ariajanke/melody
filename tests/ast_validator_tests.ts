import { AstBinaryOperatorNode } from '../src/ast_binary_operator_node';
import { AstStringLiteralNode } from '../src/ast_fringe_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { AstValidator } from '../src/ast_validator';
import { ExecutionContext } from '../src/execution_context';
import { TestHelpers } from './test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ AstValidator }, () => {
  it('beans', () => {
    const context = ExecutionContext.make();
    const validator = AstValidator.make(context);
    const intNode = AstIntegerLiteralNode.make('1');
    const strNode = AstStringLiteralNode.make("'hello'");
    const topBinNode = AstBinaryOperatorNode.make('+', intNode, strNode);
    
    const errors = validator.validate(topBinNode);
    expect(errors).toEqual([{ message: '???' }]);
  });
});
