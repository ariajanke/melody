import { AstFunctionCallNode } from '../../src/vast_build/ast_function_call_node';
import { AstNode } from '../../src/vast_build/ast_node';
import { AstTupleNode } from '../../src/vast_build/ast_tuple_node';
import { AstLetDeclarationNode } from '../../src/vast_build/ast_let_declaration_node';
import { AstIdentifierNode } from '../../src/vast_build/ast_identifier_node';
import { AstIntegerLiteralNode } from '../../src/vast_build/ast_integer_literal_node';
import { TestHelpers } from '../test_helpers';
import { AstFunctionDefinitionNode } from '../../src/vast_build/ast_function_definition_node';
import {
  LetNameElement
} from '../../src/vast_build/let_declarations_retrieval';
import { DeclarationFunctionTableBuilder } from '../../src/vast_build/declaration_function_table_builder';
import { AstLiteralNode } from '../../src/vast_build/ast_fringe_node';
import { VastIntegerLiteralNode } from '../../src/vast_literal_node';
import { IntegerType } from '../../src/integer_type';
import { Helpers } from '../../src/helpers';
import { AstNodeVisitor } from '../../src/vast_build/ast_node_visitor';
import { VastNodeResolution } from '../../src/vast_build/vast_build_visitor';
import { WritableObjectType } from '../../src/writable_object_type';
import { ObjectType } from '../../src/object_type';
import { CallingContext, FunctionType, IncompleteFunctionType } from '../../src/function_type';
import { CodeWriter } from '../../src/code_writer';
import { VastIdentifierNode, VastNode } from '../../src/vast_node';
import { VastTupleNode } from '../../src/vast_tuple_node';
import { VastFunctionDefinitionNode } from '../../src/vast_function_definition_node';

const { describeNamed } = TestHelpers;

const { freeze, memoize } = Helpers;

describeNamed({ DeclarationFunctionTableBuilder }, () => {
  const { emptyTupleInstance } = ObjectType;
  function makeDefaultVisitor(): AstNodeVisitor<VastNodeResolution> {
    function justRaise(): VastNodeResolution
      { throw new Error('conversion failed?'); }
    return freeze({
      visitFunctionCall: justRaise,
      visitLetDeclaration: justRaise,
      visitIdentifier: justRaise,
      visitTuple: justRaise,
      visitFunctionDefinition: justRaise,
      visitLiteral: justRaise
    });
  }
  const integerType = IntegerType.instance;
  const fourNode = memoize(() => AstIntegerLiteralNode.make('4'));
  const makeVisitorForNodeFour = memoize((): AstNodeVisitor<VastNodeResolution> =>
    freeze({
      ...makeDefaultVisitor(),
      visitLiteral(node: AstLiteralNode): VastNodeResolution {
        if (node.uid() === fourNode().uid()) {
          return VastNodeResolution.
            makeForVastNode(VastIntegerLiteralNode.make(integerType(), 4));
        }
        throw new Error('uh oh');
      }
    }));

  const makeLetWith = (varName: string, operation: string, valueFn: () => AstNode) =>
    AstLetDeclarationNode.
      make(AstFunctionCallNode.
        make(AstIdentifierNode.make(varName),
             AstIdentifierNode.make(operation),
             valueFn()));

  const makeLetWithTuple =
    (naming: () => AstTupleNode, operation: string, valueFn: () => AstNode) =>
    AstLetDeclarationNode.
      make(AstFunctionCallNode.
        make(naming(), AstIdentifierNode.make(operation), valueFn()));

  describe('for: "let a := 4"', () => {
    const makeA = memoize((): LetNameElement => ({
      name: 'a',
      operator: ':=',
      dependeeNames: [],
      declaringNode: makeLetWith('a', ':=', fourNode),
      valueNode: fourNode()
    }));

    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForNodeFour(), [makeA()]).
      build( WritableObjectType.make() );

    it('declares a single variable getter', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.a`);
      expect(getterTable).toBeDefined();
      if (getterTable) {
        expect(getterTable.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });

    it('declares a single variable setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.a`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).toBeDefined();
      }
    });

    it('declares an initializer', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`=a`);
      expect(lookUp).toBeDefined();
    });
  });

  describe('for: "let a = 4"', () => {
    const makeA = memoize((): LetNameElement => ({
      name: 'a',
      operator: '=',
      dependeeNames: [],
      declaringNode: makeLetWith('a', '=', fourNode),
      valueNode: fourNode()
    }));

    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForNodeFour(), [makeA()]).
      build( WritableObjectType.make() );

    it('declares a single variable getter', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.a`);
      expect(getterTable).toBeDefined();
      if (getterTable) {
        expect(getterTable.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });

    it('declares no single variable setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.a`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).not.toBeDefined();
      }
    });

    it('declares no initializer', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`=a`);
      expect(lookUp).not.toBeDefined();
    });
  });

  describe('for: "let a = b"', () => {
    const bFunc = memoize(() => IncompleteFunctionType.
      make().
      setParameters(emptyTupleInstance()).
      setReturns(integerType()).
      setBuiltin((cc: CallingContext, cw: CodeWriter) => {
        if (cc.canTake(integerType())) {
          cw.pushRepresentation(1);
        }
      }).
      finish());
    const bNode = memoize(() => AstIdentifierNode.make('b'));
    const makeA = memoize((): LetNameElement => ({
      name: 'a',
      operator: '=',
      dependeeNames: [],
      declaringNode: makeLetWith('a', '=', bNode),
      valueNode: bNode()
    }));
    const objectTypeWithB = () => {
      const obj = WritableObjectType.make();
      obj.pushFunctionTypeByName('.b', bFunc());
      return obj;
    };
    
    const makeVisitorForNodeB = memoize((): AstNodeVisitor<VastNodeResolution> =>
      freeze({
        ...makeDefaultVisitor(),
        visitIdentifier(node: AstNode): VastNodeResolution {
          if (node.uid() === bNode().uid()) {
            return VastNodeResolution.
              makeForVastNode(VastIdentifierNode.make(bFunc()));
          }
          throw new Error('uh oh');
        }
      }));
    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForNodeB(), [makeA()]).
      build( objectTypeWithB() );

    it('declares a single variable getter', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.a`);
      expect(getterTable).toBeDefined();
      if (getterTable) {
        expect(getterTable.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });

    it('declares no single variable setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.a`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).not.toBeDefined();
      }
    });

    it('declares an initializer', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`=a`);
      expect(lookUp).toBeDefined();
    });
  });

  const abTuple = memoize(() => AstTupleNode.make(',', [
    AstIdentifierNode.make('a'),
    AstIdentifierNode.make('b')
  ]));

  function initializerAndGetterABDefined(makeObjectType: () => WritableObjectType | undefined) {
    it('declares an "a" getter', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.a`);
      expect(getterTable).toBeDefined();
      if (getterTable) {
        expect(getterTable.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });

    it('declares a "b" getter', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.b`);
      expect(getterTable).toBeDefined();
      if (getterTable) {
        expect(getterTable.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });

    it('declares an "a,b" initializer', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`=a,b`);
      expect(lookUp).toBeDefined();
    });

    it('initializer takes the correct parameters', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`=a,b`);
      expect(lookUp).toBeDefined();
      const fType = lookUp?.byParameters(ObjectType.asTuple([integerType(), integerType()]));
      expect(fType).toBeDefined();
    });
  }

  function allOfABDefined(makeObjectType: () => WritableObjectType | undefined) {
    it('declares an "a" setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.a`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).toBeDefined();
      }
    });

    it('declares a "b" setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.b`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).toBeDefined();
      }
    });

    initializerAndGetterABDefined(makeObjectType);
  }

  describe('for: "let (a, b) := (3, 4)"', () => {
    const tuple34 = memoize(() => AstTupleNode.make(',', [
      AstIntegerLiteralNode.make('3'),
      fourNode()
    ]));
    const makeAB = memoize((): LetNameElement => ({
      name: 'a,b',
      operator: ':=',
      dependeeNames: [],
      declaringNode: makeLetWithTuple(abTuple, ':=', tuple34),
      valueNode: tuple34()
    }));
    const makeVisitorForABTuple = memoize((): AstNodeVisitor<VastNodeResolution> =>
      freeze({
        ...makeDefaultVisitor(),
        visitTuple(node: AstTupleNode) {
          if (node.uid() === tuple34().uid()) {
            return VastNodeResolution.
              makeForVastNode(VastTupleNode.make([
                VastIntegerLiteralNode.make(integerType(), 3),
                VastIntegerLiteralNode.make(integerType(), 4),
              ]));
          }
          throw new Error('uh oh');
        },
      }));
    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForABTuple(), [makeAB()]).
      build( WritableObjectType.make() );

    allOfABDefined(makeObjectType);    
  });

  describe('for: "let (a, b) := t"', () => {
    const tId = memoize(() => AstIdentifierNode.make('t'));
    const tFunc = memoize(() => IncompleteFunctionType.
      make().
      setParameters(emptyTupleInstance()).
      setReturns(ObjectType.asTuple([integerType(), integerType()])).
      setBuiltin((_0: CallingContext, _1: CodeWriter) => {
        throw new Error('do not call me');
      }).
      finish());
    const makeAB = memoize((): LetNameElement => ({
      name: 'a,b',
      operator: ':=',
      dependeeNames: [],
      declaringNode: makeLetWithTuple(abTuple, ':=', tId),
      valueNode: tId()
    }));
    const makeVisitorForTTuple = memoize((): AstNodeVisitor<VastNodeResolution> =>
      freeze({
        ...makeDefaultVisitor(),
        visitIdentifier(node: AstNode) {
          if (node.uid() === tId().uid()) {
            return VastNodeResolution.
              makeForVastNode(VastIdentifierNode.make(tFunc()));
          }
          throw new Error('uh oh');
        },
      }));
    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForTTuple(), [makeAB()]).
      build( WritableObjectType.make() );

    allOfABDefined(makeObjectType);
  });
  describe('for: "let (a, b) = t"', () => {
    const tId = memoize(() => AstIdentifierNode.make('t'));
    const tFunc = memoize(() => IncompleteFunctionType.
      make().
      setParameters(emptyTupleInstance()).
      setReturns(ObjectType.asTuple([integerType(), integerType()])).
      setBuiltin((_0: CallingContext, _1: CodeWriter) => {
        throw new Error('do not call me');
      }).
      finish());
    const makeAB = memoize((): LetNameElement => ({
      name: 'a,b',
      operator: '=',
      dependeeNames: [],
      declaringNode: makeLetWithTuple(abTuple, ':=', tId),
      valueNode: tId()
    }));
    const makeVisitorForTTuple = memoize((): AstNodeVisitor<VastNodeResolution> =>
      freeze({
        ...makeDefaultVisitor(),
        visitIdentifier(node: AstNode) {
          if (node.uid() === tId().uid()) {
            return VastNodeResolution.
              makeForVastNode(VastIdentifierNode.make(tFunc()));
          }
          throw new Error('uh oh');
        },
      }));

    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForTTuple(), [makeAB()]).
      build( WritableObjectType.make() );

    it('does NOT declares an "a" setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.a`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).not.toBeDefined();
      }
    });

    it('does NOT declares a "b" setter', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`.b`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(integerType())).not.toBeDefined();
      }
    });

    initializerAndGetterABDefined(makeObjectType);
  });

  describe('for: "let f = fn ~"', () => {
    const fId = memoize(() => AstIdentifierNode.make('f'));
    const fNode = memoize(() => AstFunctionDefinitionNode.make([]));
    const makeF = memoize((): LetNameElement => ({
      name: 'f',
      operator: '=',
      dependeeNames: [],
      declaringNode: AstLetDeclarationNode.
        make(AstFunctionCallNode.make(fId(), AstIdentifierNode.make('='), fNode())),
      valueNode: fNode()
    }));

    const makeVisitorForFNode = memoize((): AstNodeVisitor<VastNodeResolution> =>
      freeze({
        ...makeDefaultVisitor(),
        visitFunctionDefinition(node: AstNode, _1: AstNode[]) {
          if (node.uid() === fNode().uid()) {
            return VastNodeResolution.
              makeForVastNode(VastFunctionDefinitionNode.
                make( [], FunctionType.asAnObjectType() ));
          }
          throw new Error('uh oh');
        },
      }));

    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForFNode(), [makeF()]).
      build( WritableObjectType.make() );

    it('does declare a "f" function', () => {
      const objType = makeObjectType();
      const lookUp = objType!.objectType().lookUp(`f`);
      expect(lookUp).toBeDefined();
      if (lookUp) {
        expect(lookUp.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });
  });

  describe('for: "let a = (1, 2, 3)"', () => {
    function makeIntVastNode(n: number): VastNode {
      return VastIntegerLiteralNode.make(IntegerType.instance(), n);
    }
    const oneNode = memoize(() => AstIntegerLiteralNode.make('1'));
    const twoNode = memoize(() => AstIntegerLiteralNode.make('2'));
    const threeNode = memoize(() => AstIntegerLiteralNode.make('3'));
    const tNode = memoize(() => AstTupleNode.make(',', [
      oneNode(), twoNode(), threeNode()
    ]));
    const aId = memoize(() => AstIdentifierNode.make('a'));
    const makeA = memoize((): LetNameElement => ({
      name: 'a',
      operator: '=',
      dependeeNames: [],
      declaringNode: AstLetDeclarationNode.
        make(AstFunctionCallNode.make(aId(), AstIdentifierNode.make('='), tNode())),
      valueNode: tNode()
    }));

    const makeVisitorForANode = memoize((): AstNodeVisitor<VastNodeResolution> =>
      freeze({
        ...makeDefaultVisitor(),
        visitTuple(node: AstTupleNode) {
          if (node.uid() === tNode().uid()) {
            return VastNodeResolution.makeForVastNode(VastTupleNode.
              make([makeIntVastNode(1), makeIntVastNode(2), makeIntVastNode(3)]));
          }
          throw new Error('oh no');
        },
      }));

    const makeObjectType = () => DeclarationFunctionTableBuilder.
      make(makeVisitorForANode(), [makeA()]).
      build( WritableObjectType.make() );

    it('declares an "a" getter', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.a`);
      expect(getterTable).toBeDefined();
      if (getterTable) {
        expect(getterTable.byParameters(emptyTupleInstance())).toBeDefined();
      }
    });

    it('"a" getter returns an entire tuple', () => {
      const objType = makeObjectType();
      const getterTable = objType!.objectType().lookUp(`.a`);
      expect(getterTable).toBeDefined();
      if (!getterTable)
        { return; }
      expect(getterTable.byParameters(emptyTupleInstance())?.returns().name()).
        toEqual('Tuple(Integer, Integer, Integer)');
      // catch failed???
    });
  
  });
});