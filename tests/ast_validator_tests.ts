import { AstBinaryOperatorNode } from '../src/ast_binary_operator_node';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { AstStringLiteralNode } from '../src/ast_string_literal_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { AstTupleNode } from '../src/ast_tuple_node';
import { AstValidator } from '../src/ast_validator';
import { TestHelpers } from './test_helpers';
import { AstLetDeclarationNode } from '../src/ast_let_declaration_node';
import { AstNode } from '../src/ast_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstValidator }, () => {
  function validateAsTuple(node: AstNode, validator: AstValidator) {
    const topTupleNode = AstTupleNode.make([node]);
    return validator.validate(topTupleNode);
  }

  it('Cannot find function call for binary operator', () => {
    const validator = AstValidator.make();
    const intNode = AstIntegerLiteralNode.make('1');
    const strNode = AstStringLiteralNode.make("'hello'");
    const topBinNode = AstBinaryOperatorNode.make('+', intNode, strNode);
    
    const errors = validateAsTuple(topBinNode, validator);
    expect(errors).toEqual([{ message: 'Could not resolve function call for "+"' }]);
  });

  it('cannot use an undefined variable', () => {
    const validator = AstValidator.make();
    const idNode = AstIdentifierNode.make('name');
    const strNode = AstStringLiteralNode.make("'hello'");
    const topBinNode = AstBinaryOperatorNode.make('+', idNode, strNode);
    
    const errors = validateAsTuple(topBinNode, validator);
    expect(errors).toEqual([{ message: 'Undeclared variable "name"' }]);
  });

  it('cannot use an identifier (alone) to declare a variable', () => {
    const validator = AstValidator.make();
    const idNode = AstIdentifierNode.make('name');
    const topLetNode = AstLetDeclarationNode.make(idNode);

    const errors = validateAsTuple(topLetNode, validator);
    expect(errors).toEqual([{ message: 'Cannot declare using a(n) identifier' }]);
  });

  it('cannot use a "+" to declare a variable', () => {
    const validator = AstValidator.make();
    const idNode = AstIdentifierNode.make('name');
    const strNode = AstStringLiteralNode.make("'hello'");
    const binNode = AstBinaryOperatorNode.make('+', idNode, strNode);
    const topLetNode = AstLetDeclarationNode.make(binNode);
    
    const errors = validateAsTuple(topLetNode, validator);
    expect(errors).toEqual([{ message: 'Cannot use operator "+" in a let declaration' }]);
  });

  it('cannot use a string literal (directly) to name a variable', () => {
    const validator = AstValidator.make();
    const strNode = AstStringLiteralNode.make("'hello'");
    const intNode = AstIntegerLiteralNode.make('1');
    const binNode = AstBinaryOperatorNode.make(':=', strNode, intNode);
    const topLetNode = AstLetDeclarationNode.make(binNode);

    const errors = validateAsTuple(topLetNode, validator);
    expect(errors).toEqual([{ message: 'Cannot use string literal to name a variable' }]);
  });

  it('a totally valid let declaration, produces no errors', () => {
    const validator = AstValidator.make();
    const idNode = AstIdentifierNode.make('name');
    const strNode = AstStringLiteralNode.make("'hello'");
    const binNode = AstBinaryOperatorNode.make(':=', idNode, strNode);
    const topLetNode = AstLetDeclarationNode.make(binNode);
    
    const errors = validateAsTuple(topLetNode, validator);
    expect(errors).toEqual([]);
  });
});
