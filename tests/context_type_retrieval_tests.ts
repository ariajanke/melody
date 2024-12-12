import { AstFunctionCallNode } from '../src/ast_function_call_node';
import { AstNode } from '../src/ast_node';
import { AstTupleNode } from '../src/ast_tuple_node';
import { AstLetDeclarationNode } from '../src/ast_let_declaration_node';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { ObjectLookUpTable } from '../src/object_look_up_table';
import { ContextTypeRetrieval } from '../src/context_type_retrieval';
import { TestHelpers } from './test_helpers';

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

  it('correctly deduces type on an operator and literal', () => {
    // let a := 3
    // let b := a + 3
    const threeTheInt = makeInt('3');
    const aVar = AstIdentifierNode.make('a');
    const aAss = makeOp(':=', aVar, threeTheInt);
    const aLet = AstLetDeclarationNode.make(aAss);
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
    expect(obj.lookUp('.b')?.byParameters([])?.returns()[0]?.name()).toEqual('Integer');
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
