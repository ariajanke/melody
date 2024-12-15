import { AstFunctionCallNode } from '../src/ast_function_call_node';
import { AstNode } from '../src/ast_node';
import { AstTupleNode } from '../src/ast_tuple_node';
import { AstLetDeclarationNode } from '../src/ast_let_declaration_node';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { ObjectLookUpTable } from '../src/object_look_up_table';
import { ContextTypeRetrieval } from '../src/context_type_retrieval';
import { TestHelpers } from './test_helpers';
import { AstLiteralNode } from '../src/ast_fringe_node';
import { AstFunctionDefinitionNode } from '../src/ast_function_definition_node';
import { ObjectType } from '../src/object_type';
import { type VariableDeclarationFunctionTable } from '../src/variable_declaration_function_table';

const { describeNamed } = TestHelpers;

describeNamed({ ContextTypeRetrieval }, () => {
  function makeInt(val: string) {
    return AstIntegerLiteralNode.make(val);
  }
  function makeOp(op: string, rec: AstNode, params: AstNode) {
    return AstFunctionCallNode.
      make(rec, AstIdentifierNode.make(op), params);
  }
  const makeObjTable = () =>
    ObjectLookUpTable.make().addBuiltinTypes();

  it('finds declaration in "let a := 4 + 4"', () => {
    const oTable = makeObjTable();
    const fourTheInt = makeInt('4');
    const plus = makeOp('+', fourTheInt, AstTupleNode.make(',', [fourTheInt]));
    const aVar = AstIdentifierNode.make('a');
    const assign = makeOp(':=', aVar, plus);
    const letDec = AstLetDeclarationNode.make(assign);
    const context = ContextTypeRetrieval.make(letDec, oTable);
    const obj = context.resolve();
    if (!obj) {
      return fail();
    }
    expect(obj.lookUp('.a')?.byParameters([])).toBeDefined();
  });

  function mkAssign(name: string, literal: AstLiteralNode) {
    const aVar = AstIdentifierNode.make(name);
    return makeOp(':=', aVar, literal);
  }

  function mkLetNode(name: string, literal: AstLiteralNode) {
    const aAss = mkAssign(name, literal);
    return AstLetDeclarationNode.make(aAss);
  }

  function returnNamesOf(name: string, objType: ObjectType) {
    return objType.lookUp(name)?.byParameters([])?.returns()[0]?.name();
  }

  it('correctly deduces type on an operator and literal', () => {
    // let a := 3
    // let b := a + 3
    const threeTheInt = makeInt('3');
    const aVar = AstIdentifierNode.make('a');
    const aLet = mkLetNode('a', threeTheInt);
    const plus = makeOp('+', aVar, threeTheInt);
    const bVar = AstIdentifierNode.make('b');
    const bAss = makeOp(':=', bVar, plus);
    const bLet = AstLetDeclarationNode.make(bAss);
    const tuple = AstTupleNode.make(',', [aLet, bLet]);
    const ctxRes = ContextTypeRetrieval.make(tuple, makeObjTable());
    const obj = ctxRes.resolve();
    if (!obj) {
      throw new Error(ctxRes.error().message);
    }
    expect(returnNamesOf('.a', obj)).toEqual('Integer');
    expect(returnNamesOf('.b', obj)).toEqual('Integer');
  });

  function mkSingleDefWithLetAAndB() {
    const aLet = mkLetNode('a', makeInt('3'));
    const bLet = mkLetNode('b', makeInt('4'));
    return AstFunctionDefinitionNode.make([aLet, bLet]);
  }

  it('finds declarations when starting on a function definition', () => {
    const def = mkSingleDefWithLetAAndB();
    const ctxRes = ContextTypeRetrieval.make(def, makeObjTable());
    const obj = ctxRes.resolve();
    if (!obj) {
      throw new Error(ctxRes.error().message);
    }
    const aOffset = (obj.lookUp('.a') as VariableDeclarationFunctionTable)?.offset();
    const bOffset = (obj.lookUp('.b') as VariableDeclarationFunctionTable)?.offset();
    expect(aOffset).toEqual(0);
    expect(bOffset).toEqual(1);
  });

  it('declarations are given their own slots in memory', () => {
    const def = mkSingleDefWithLetAAndB();
    const ctxRes = ContextTypeRetrieval.make(def, makeObjTable());
    const obj = ctxRes.resolve();
    if (!obj) {
      throw new Error(ctxRes.error().message);
    }
    expect(returnNamesOf('.a', obj)).toEqual('Integer');
    expect(returnNamesOf('.b', obj)).toEqual('Integer');
  });

  it('does not find declarations in nested functions', () => {
    const aLet = mkLetNode('a', makeInt('3'));
    const bLet = mkLetNode('b', makeInt('4'));
    const def = AstFunctionDefinitionNode.
      make([
        aLet,
        AstFunctionDefinitionNode.make([bLet])
      ]);
    const ctxRes = ContextTypeRetrieval.make(def, makeObjTable());
    const obj = ctxRes.resolve();
    if (!obj) {
      throw new Error(ctxRes.error().message);
    }
    expect(returnNamesOf('.a', obj)).toEqual('Integer');
    expect(returnNamesOf('.b', obj)).toBeUndefined();
  });

  it('identifies missing declaration', () => {
    const threeTheInt = makeInt('3');
    const aVar = AstIdentifierNode.make('a');
    const plus = makeOp('+', aVar, threeTheInt);
    const bVar = AstIdentifierNode.make('b');
    const bAss = makeOp(':=', bVar, plus);
    const bLet = AstLetDeclarationNode.make(bAss);
    const tuple = AstTupleNode.make(',', [bLet]);
    const ctxRes = ContextTypeRetrieval.make(tuple, makeObjTable());
    expect(ctxRes.resolve()).toBeUndefined();
    expect(ctxRes.error().message).toEqual('"a" is not declared');
  });
});
