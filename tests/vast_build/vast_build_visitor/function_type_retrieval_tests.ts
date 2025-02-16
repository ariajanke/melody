import { ReachPoint, TestHelpers } from '../../test_helpers';
import {
  FunctionTypeRetrieval
} from '../../../src/vast_build/vast_build_visitor/function_type_retrieval';
import { AstIdentifierNode } from '../../../src/vast_build/ast_identifier_node';
import { AstFunctionCallNode } from '../../../src/vast_build/ast_function_call_node';
import { VastIdentifierNode } from '../../../src/vast_node';
import { IncompleteFunctionType } from '../../../src/function_type';
import { Helpers } from '../../../src/helpers';
import { ObjectLookUpTable } from '../../../src/object_look_up_table';
import { WritableObjectType } from '../../../src/writable_object_type';
import { ObjectType } from '../../../src/object_type';
import { AstTupleNode } from '../../../src/vast_build/ast_tuple_node';
import { ContextType } from '../../../src/context_type';
import { AstIntegerLiteralNode } from '../../../src/vast_build/ast_integer_literal_node';
import { VastIntegerLiteralNode } from '../../../src/vast_literal_node';

const { memoize, presenceAsserted, freeze } = Helpers;
const { describeNamed } = TestHelpers;

describeNamed({ FunctionTypeRetrieval }, () => {
  const { emptyTupleInstance } = ObjectType;
  const objectTable = memoize(ObjectLookUpTable.make().addBuiltinTypes);
  const integerType = memoize(() =>
    objectTable().lookUpByName('Integer').resolve() ?? (() => { throw new Error('ug'); })());
  const notInsideLet = freeze({ isInsideLet: () => false });
  const insideLet = freeze({ isInsideLet: () => true });
  
  const aFunc = memoize(() => IncompleteFunctionType.
    make().
    setName('.a').
    setParameters(emptyTupleInstance()).
    setReturns(integerType()).
    implementationDoesNothing().
    finish());
  const aId = memoize(() => AstIdentifierNode.make('a'));
  const bId = memoize(() => AstIdentifierNode.make('b'));
  const eqId = memoize(() => AstIdentifierNode.make('='));
  const setterId = memoize(() => AstIdentifierNode.make(':='));
  const aAsVast = memoize(() => VastIdentifierNode.make(aFunc()));
  const contextId = memoize(() => AstIdentifierNode.make('<context>'));
  const bAsParams = memoize(() => AstTupleNode.make(',', [bId()]));
  const makeContextType = () =>
    WritableObjectType.make().setName(ContextType.typeName());
  const threeAsParams = memoize(() => AstTupleNode.make(',', [
    AstIntegerLiteralNode.make('3')
  ]));
  const threeAsVast = memoize(() => VastIntegerLiteralNode.make(integerType(), 3));
  // case 1
  // f(a)
  describe("retrieving 'f(a)'", () => {  
    const fFunc = memoize(() => IncompleteFunctionType.
      make().
      setName('f').
      implementationDoesNothing().
      setParameters(integerType()).
      setReturns(emptyTupleInstance()).
      finish());
    
    const aAsParams = memoize(() => AstTupleNode.make(',', [aId()]));
    const fId = memoize(() => AstIdentifierNode.make('f'));

    it('sought correct function', () => {
      const objTable = ObjectLookUpTable.make().addBuiltinTypes();
      const callNode = AstFunctionCallNode.make( contextId(), fId(), aAsParams() );
      const contextType = makeContextType();
      contextType.pushFunctionTypeByName('f', fFunc());
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      objTable.temporarilyDefineType(contextType.objectType(), () => {
        const retr = FunctionTypeRetrieval.
          make( callNode, contextId(), aAsParams(), objTable, notInsideLet, aAsVast() );
        expect(retr.build()?.functionType?.uid()).toEqual(fFunc().uid());
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  });
  // node "f"
  // case 2
  // a + b
  describe("retrieving 'a + b'", () => {
    const plusFunc = memoize(presenceAsserted(() =>
      integerType().lookUp('+')!.byParameters(integerType())));

    it('sought correct function', () => {
      const contextType = makeContextType();
      const objTable = ObjectLookUpTable.make().addBuiltinTypes();
      const callNode = AstFunctionCallNode.
        make(aId(), AstIdentifierNode.make('+'), bAsParams() );
      contextType.pushFunctionTypeByName('.a', aFunc());
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      objTable.temporarilyDefineType(contextType.objectType(), () => {
        const retr = FunctionTypeRetrieval.
          make( callNode, aId(), bAsParams(), objTable,notInsideLet, aAsVast() );
        expect(retr.build()!.functionType.uid()).toEqual(plusFunc().uid());
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  });
  // case 3
  // let a = 3 # PTC
  describe("retrieving 'let a = 3'", () => {
    
    it('sought correct function', () => {
      const contextType = makeContextType();
      const objTable = ObjectLookUpTable.make().addBuiltinTypes();
      const callNode = AstFunctionCallNode.make( aId(), eqId(), threeAsParams());
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      objTable.temporarilyDefineType(contextType.objectType(), () => {
        const retr = FunctionTypeRetrieval.
          make( callNode, aId(), bAsParams(), objTable, insideLet, threeAsVast() );
        expect(retr.build()!.functionType.uid()).
          toEqual(threeAsVast().functionType().uid());
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  });


  // case 4
  // a := 3
  describe("retrieving 'a := 3'", () => {
    const aAssignment = memoize(() => IncompleteFunctionType.
      make().
      setName('.a').
      setParameters(integerType()).
      setReturns(integerType()).
      implementationDoesNothing().
      finish());

    it('sought correct function', () => {
      const contextType = makeContextType();
      const objTable = ObjectLookUpTable.make().addBuiltinTypes();
      const callNode = AstFunctionCallNode.make(aId(), setterId(), threeAsParams());
      contextType.pushFunctionTypeByName('.a', aAssignment());
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      objTable.temporarilyDefineType(contextType.objectType(), () => {
        const retr = FunctionTypeRetrieval.
          make( callNode, aId(), threeAsParams(), objTable, notInsideLet, threeAsVast() );
        expect(retr.build()!.functionType.uid()).toEqual(aAssignment().uid());
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  });

  // an initializer is a special type of setter that can only be called once
  const aInitialize = memoize(() => IncompleteFunctionType.
    make().
    setName('=a').
    setParameters(integerType()).
    setReturns(integerType()).
    implementationDoesNothing().
    finish());

  // case 5
  // let a = b # RTC
  describe("retrieving 'let a = b'", () => {

    const bFunc = memoize(() => IncompleteFunctionType.
      make().
      setName('.b').
      setParameters(emptyTupleInstance()).
      setReturns(integerType()).
      implementationDoesNothing().
      finish());
    const bAsVast = memoize(() => VastIdentifierNode.make(bFunc()));

    it('sought correct function', () => {
      const contextType = makeContextType();
      const objTable = ObjectLookUpTable.make().addBuiltinTypes();
      const callNode = AstFunctionCallNode.make(aId(), setterId(), bId());
      contextType.pushFunctionTypeByName('=a', aInitialize());
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      objTable.temporarilyDefineType(contextType.objectType(), () => {
        const retr = FunctionTypeRetrieval.
          make( callNode, aId(), bAsParams(), objTable, insideLet, bAsVast() );
        expect(retr.build()!.functionType.uid()).toEqual(aInitialize().uid() );
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  });
  // case 6
  // let a := 3 # actually touch memory
  describe("retrieving 'let a := 3'", () => {
    it('sought correct function', () => {
      const contextType = makeContextType();
      const objTable = ObjectLookUpTable.make().addBuiltinTypes();
      const callNode = AstFunctionCallNode.make(aId(), setterId(), threeAsParams());
      contextType.pushFunctionTypeByName('=a', aInitialize());
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      objTable.temporarilyDefineType(contextType.objectType(), () => {
        const retr = FunctionTypeRetrieval.
          make( callNode, aId(), threeAsParams(), objTable, insideLet, threeAsVast() );
        expect(retr.build()!.functionType.uid()).toEqual(aInitialize().uid());
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  });

//   // case 7
//   // let (a, b) = (3, 2)
//   // case 8
//   // let (a, b) = t # PTC
//   // case 9
//   // let (a, b) := t
});
