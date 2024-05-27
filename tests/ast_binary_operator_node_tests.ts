import { TestHelpers, ReachPoint } from './test_helpers';
import { AstBinaryOperatorNode } from '../src/ast_binary_operator_node';
import { AstEvaluatableNode, AstNode, AstNodeVisitor } from '../src/ast_node';
import { AstIdentifierNode } from '../src/ast_stringable_node';
import { TypeLookUpTable } from '../src/ast_node';
import { ContextVariable } from '../src/context_variable';
import { ObjectType } from '../src/object_type';
import { IncompleteFunctionType, ParameterFit } from '../src/function_type';

const { describeNamed } = TestHelpers;

describeNamed({ AstBinaryOperatorNode }, () => {
  const { make } = AstBinaryOperatorNode;
  const makeIdentifier = AstIdentifierNode.make;
  // assignment node represents (for now) this: ':='
  // sort of meaning "set lhs (an identifier) to the rhs's string content" for
  // the program's current context
  it('is reachable by visitor', () => {
    const { points, verifyAllHit } = ReachPoint.makeCollection(1);
    const visitor = AstNodeVisitor.makeFakeVisitor({
      visitBinaryOperation: (_0: string, _1: AstNode, _2: AstNode) => {
        points()[0].hitsAtExactly(1);
      }
    });
    make(':=', makeIdentifier(''), makeIdentifier('')).visit(visitor);
    expect(verifyAllHit).toBeTruthy();
  });

  it('reports self as a binary operator node type', () => {
    const type = make(':=', makeIdentifier(''), makeIdentifier('')).type();
    expect(type).toEqual(AstNode.types.binaryOperator);
  });

  it('maybe visited for assigee name', () => {
    let assigneeName = '';
    const visitor = AstNodeVisitor.makeFakeVisitor({
      visitBinaryOperation: (_0: string, node: AstNode, _1: AstNode) => {
        AstEvaluatableNode.tryDowncast(node)?.evaluate((name: string) => {
          assigneeName = name;
          return ContextVariable.make();
        })
      }
    });
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
      })
      const a: TypeLookUpTable = {
        lookUpIdentifierType: (_0: string): ObjectType => {
          return sampleObjectType;
        }
      };
      const node = make('foo', makeIdentifier(''), makeIdentifier(''));
      const extype = node.executionType(a);
      expect(extype.uid).toEqual(sampleReturnType.uid);
    });
  });

  // so far, the *only* type that exist is the string
});
