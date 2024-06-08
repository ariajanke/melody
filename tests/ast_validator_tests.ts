import { AstBinaryOperatorNode } from '../src/ast_binary_operator_node';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { AstTupleNode } from '../src/ast_tuple_node';
import { AstValidator } from '../src/ast_validator';
import { ExecutionContext } from '../src/execution_context';
import { TestHelpers } from './test_helpers';

const { describeNamed } = TestHelpers;

describeNamed({ AstValidator }, () => {
  it('Cannot find function call for binary operator', () => {
    const context = ExecutionContext.make();
    const validator = AstValidator.make(context);
    const intNode = AstIntegerLiteralNode.make('1');
    const strNode = AstStringLiteralNode.make("'hello'");
    const topBinNode = AstBinaryOperatorNode.make('+', intNode, strNode);
    const topTupleNode = AstTupleNode.make([topBinNode]);
    
    const errors = validator.validate(topTupleNode);
    expect(errors).toEqual([{ message: 'Could not resolve function call for "+"' }]);
  });

  it('cannot use an undefined variable', () => {
    const context = ExecutionContext.make();
    const validator = AstValidator.make(context);
    const idNode = AstIdentifierNode.make('name');
    const strNode = AstStringLiteralNode.make("'hello'");
    const topBinNode = AstBinaryOperatorNode.make('+', idNode, strNode);
    const topTupleNode = AstTupleNode.make([topBinNode]);
    
    const errors = validator.validate(topTupleNode);
    expect(errors).toEqual([{ message: 'Undeclared variable "name"' }]);
  });
});
