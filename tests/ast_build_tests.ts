import { AstBuild } from '../src/ast_build';
import { ReachPoint, TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenCollection } from '../src/tokenization';
import { AstNode, AstNodeVisitor } from '../src/ast_node';
import { AstFunctionCallNode } from '../src/ast_function_call_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstBuild }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;

  describe('builds a mutli-line ast', () => {
    let tokens: Token[] = [];
    const buildAst = () => AstBuild.buildFor(TokenCollection.make(tokens));

    it('builds two function calls', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(1);
      tokens = [
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];

      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitFunctionCall: (_0: AstFunctionCallNode) => {
          points()[0].hitsAtExactly(2);
        },
      });
      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('two lines, operator first, call second', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(1);
      tokens = [
        makeToken('\n'),
        makeToken('a'), makeToken(','), makeToken('b'), makeToken('\n'),
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];

      let i = 0;
      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitFunctionCall: (_0: AstFunctionCallNode) => {
          points()[0].hitsAtExactly(1);
        },
      });
      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('builds ast with arthimetic', () => {
      tokens = [
        makeToken('2'), makeToken('+'), makeToken('2')
      ];

      let vop = '';
      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitBinaryOperation: (op: string, lhs: AstNode, rhs: AstNode) => {
          const { valueOf } = AstIntegerLiteralNode;
          vop = op;
          expect(valueOf(lhs)).toEqual(2);
          expect(valueOf(rhs)).toEqual(2);
        },
      });
      buildAst().visit(visitor);
      expect(vop).toEqual('+');
    });
  });
});
