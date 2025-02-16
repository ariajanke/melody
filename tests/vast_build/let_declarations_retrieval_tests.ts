import { AstFunctionCallNode } from '../../src/vast_build/ast_function_call_node';
import { AstNode } from '../../src/vast_build/ast_node';
import { AstTupleNode } from '../../src/vast_build/ast_tuple_node';
import { AstLetDeclarationNode } from '../../src/vast_build/ast_let_declaration_node';
import { AstIdentifierNode } from '../../src/vast_build/ast_identifier_node';
import { AstIntegerLiteralNode } from '../../src/vast_build/ast_integer_literal_node';
import { TestHelpers } from '../test_helpers';
import { AstFunctionDefinitionNode } from '../../src/vast_build/ast_function_definition_node';
import {
  LetDeclarationsRetrieval,
  LetNameElement
} from '../../src/vast_build/let_declarations_retrieval';

const { describeNamed } = TestHelpers;

describeNamed({ LetDeclarationsRetrieval }, () => {
  function makeEqual(lhs: AstNode, rhs: AstNode) {
    return AstFunctionCallNode.
      make(lhs, AstIdentifierNode.make('='), rhs);
  }
  function makeSingleDecl(name: string, node: AstNode) {
    const assignment = makeEqual(AstIdentifierNode.make(name), node);
    return AstLetDeclarationNode.make(assignment);
  }
  function makeDoubleDecl(name1: string, name2: string, node: AstNode) {
    const tuple = AstTupleNode.make(',', [
      AstIdentifierNode.make(name1), AstIdentifierNode.make(name2)
    ]);
    return AstLetDeclarationNode.make(makeEqual(tuple, node));
  }
  const toName = (el: LetNameElement) => el.name;
  function stripNodesFrom(el: LetNameElement | undefined) {
    return {
      name: el?.name,
      operator: el?.operator,
      dependeeNames: el?.dependeeNames
    };
  }
  it('captures a single declaration', () => {
    // let a = 1
    const letDecl = makeSingleDecl('a', AstIntegerLiteralNode.make('1'));
    const res = LetDeclarationsRetrieval.
      make(letDecl).elements()?.map(toName);
    expect(res).toEqual(['a']);
  });

  it('captures a couple of declaration', () => {
    // let a = 1
    // let b = 1
    const letA = makeSingleDecl('a', AstIntegerLiteralNode.make('1'));
    const letB = makeSingleDecl('b', AstIntegerLiteralNode.make('1'));
    const def = AstFunctionDefinitionNode.make([letA, letB]);
    const res = LetDeclarationsRetrieval.
      make(def).elements()?.map(toName);
    expect(res).toEqual(['a', 'b']);
  });

  it('handles a declaration with a dependee', () => {
    // let a = b + 4
    const addition = AstFunctionCallNode.
      make(AstIdentifierNode.make('b'),
           AstIdentifierNode.make('+'),
           AstIntegerLiteralNode.make('4'));
    const letA = makeSingleDecl('a', addition);
    const firstEl = (LetDeclarationsRetrieval.make(letA).elements() ?? [])[0];
    const res = stripNodesFrom(firstEl);
    expect(res).toEqual({
      name: 'a',
      operator: '=',
      dependeeNames: ['b']
    });
  });

  it('captures a multi-declaration', () => {
    // let (x, y) = (a, b)
    const tuple = AstTupleNode.make(',', [
      AstIdentifierNode.make('a'),
      AstIdentifierNode.make('b')
    ]);
    const decl = makeDoubleDecl('x', 'y', tuple);
    const res = LetDeclarationsRetrieval.make(decl).elements();
    expect(res?.map(toName)).toEqual(['x', 'y']);
    const firstRes = (res ?? [])[0];
    const secondRes = (res ?? [])[1];
    expect(stripNodesFrom(firstRes)).toEqual({
      name: 'x',
      operator: '=',
      dependeeNames: ['a', 'b']
    });
    expect(stripNodesFrom(secondRes)).toEqual({
      name: 'y',
      operator: '=',
      dependeeNames: ['a', 'b']
    });
  });

  it('captures a declaration of a tuple to a single variable', () => {
    // let a := (x, y)
    const tuple = AstTupleNode.make(',', [
      AstIdentifierNode.make('x'),
      AstIdentifierNode.make('y')
    ]);
    const decl = makeSingleDecl('a', tuple);
    const res = (LetDeclarationsRetrieval.make(decl).elements() ?? [])[0];
    expect(stripNodesFrom(res)).
      toEqual({ name: 'a', operator: '=', dependeeNames: ['x', 'y'] });
  });

  it('captures a multi-declaration to a single identifier', () => {
    // let (x, y) = a
    const decl = makeDoubleDecl('x', 'y', AstIdentifierNode.make('a'));
    const res = LetDeclarationsRetrieval.make(decl).elements();
    const strippedRes = res?.map(stripNodesFrom);
    expect(strippedRes).toEqual([
      { name: 'x,y', operator: '=', dependeeNames: ['a'] }
    ]);
  });

  it('covers caught test case', () => {
    // let (b, c, d) = a
    const tuple = AstTupleNode.make(',', [
      AstIdentifierNode.make('b'),
      AstIdentifierNode.make('c'),
      AstIdentifierNode.make('d'),
    ]);
    const decl = AstLetDeclarationNode.make(makeEqual(tuple, AstIdentifierNode.make('a')));
    // check value node of b, make sure its type is just "Integer"
    const res = LetDeclarationsRetrieval.make(decl).elements();
    const strippedRes = res?.map(stripNodesFrom);
    expect(strippedRes).toEqual([
      { name: 'b,c,d', operator: '=', dependeeNames: ['a'] }
    ]);
  });
});
