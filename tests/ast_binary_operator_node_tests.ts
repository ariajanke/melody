import { TestHelpers, ReachPoint } from './test_helpers';
import { AstBinaryOperatorNode } from '../src/ast_binary_operator_node';
import { AstEvaluatableNode, AstNode } from '../src/ast_node';
import { TypeLookUpTable } from '../src/ast_node';
import { AstIdentifierNode } from '../src/ast_identifier_node';
import { ContextVariable } from '../src/context_variable';
import { ObjectType } from '../src/object_type';
import { IncompleteFunctionType, ParameterFit } from '../src/function_type';
import { TypeResolution } from '../src/type_resolution';
import { ObjectLookUpTable } from '../src/object_look_up_table';
import { AstNodeVisitorBuilder } from '../src/ast_node_visitor';

const { describeNamed } = TestHelpers;

describeNamed({ AstBinaryOperatorNode }, () => {
  const { make } = AstBinaryOperatorNode;
  const makeIdentifier = AstIdentifierNode.make;
  // assignment node represents (for now) this: ':='
  // sort of meaning "set lhs (an identifier) to the rhs's string content" for
  // the program's current context
  it('is reachable by visitor', () => {
    const { hitsAtExactly, verifyHit } = ReachPoint.make();
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToContinue().
      visitBinaryOperation((_0: AstBinaryOperatorNode, _1: AstNode, _2: AstNode) => {
        hitsAtExactly(1);
        // NOTE terminates visiting deeper
      }).
      finish();
    make(':=', makeIdentifier(''), makeIdentifier('')).visit(visitor);
    expect(verifyHit()).toBeTruthy();
  });

  it('reports self as a binary operator node type', () => {
    const type = make(':=', makeIdentifier(''), makeIdentifier('')).type();
    expect(type).toEqual(AstNode.types.binaryOperator);
  });

  it('maybe visited for assigee name', () => {
    let assigneeName = '';
    const visitor = AstNodeVisitorBuilder.
      makeDefaultingToContinue().
      visitBinaryOperation((_0: AstBinaryOperatorNode, node: AstNode, _1: AstNode) => {
        AstEvaluatableNode.tryDowncast(node)?.evaluate((name: string) => {
          assigneeName = name;
          return ContextVariable.make();
        });
        // NOTE terminates visiting deeper
      }).
      finish();
    make(':=', makeIdentifier('foo'), makeIdentifier('')).visit(visitor);
    expect(assigneeName).toEqual('foo');
  });

  describe('#executionType', () => {
    it('deduces return type correctly', () => {
      const sampleObjectType = ObjectType.make();
      const sampleReturnType = ObjectType.make();
      const funcType = IncompleteFunctionType.
        make().
        setName('foo').
        setArguments([{ fitType: ParameterFit.isType, interfaceType: undefined, objectType: sampleObjectType.uid }]).
        setReturns([ sampleReturnType ]).
        finish();
      sampleObjectType.setLookUp({
        ['foo']: funcType
      });
      const a: TypeLookUpTable = {
        lookUpIdentifierType: (_0: string): TypeResolution => {
          return TypeResolution.makeFixedForType(sampleObjectType);
        },
        lookUpIntegerLiteralType: () =>
          TypeResolution.makeFixedForType(ObjectLookUpTable.getBuiltinTypes().Integer),
        lookUpStringLiteralType: () =>
          TypeResolution.makeFixedForType(ObjectLookUpTable.getBuiltinTypes().String)
      };
      const node = make('foo', makeIdentifier(''), makeIdentifier(''));
      const exres = node.executionType(a);
      const extype = exres.resolve();
      expect(extype?.uid).toEqual(sampleReturnType.uid);
    });
  });
});
