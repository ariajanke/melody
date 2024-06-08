import { AstBuild } from '../src/ast_build';
import { ReachPoint, TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { AstNode } from '../src/ast_node';
import { AstFunctionCallNode } from '../src/ast_function_call_node';
import { AstIntegerLiteralNode } from '../src/ast_integer_literal_node';
import { AstLetDeclarationNode } from '../src/ast_let_declaration_node';
import { AstFringeNode } from '../src/ast_fringe_node';
import { AstTupleNode } from '../src/ast_tuple_node';
import { TokenRange } from '../src/token_range';
import { AstNodeVisitorBuilder } from '../src/ast_node_visitor';
import { AstBinaryOperatorNode } from '../src/ast_binary_operator_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstBuild }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;

  describe('builds a mutli-line ast', () => {
    let tokens: Token[] = [];
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it('builds two function calls', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(1);
      tokens = [
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];

      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          points()[0].hitsAtExactly(2);
          node.arguments.forEach((node: AstNode) => {
            node.visit(visitor);
          });
        }).
        finish();
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

      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          points()[0].hitsAtExactly(1);
          node.arguments.forEach((node: AstNode) => {
            node.visit(visitor);
          });
        }).
        finish();

      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('builds ast with arthimetic', () => {
      tokens = [
        makeToken('2'), makeToken('+'), makeToken('2')
      ];

      let vop = '';
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((op: string, _1: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
          const { valueOf } = AstIntegerLiteralNode;
          vop = op;
          expect(valueOf(lhs)).toEqual(2);
          expect(valueOf(rhs)).toEqual(2);
        }).
        finish();

      buildAst().visit(visitor);
      expect(vop).toEqual('+');
    });

    it('builds ast with let declaration', () => {
      tokens = [
        makeToken('let'), makeToken('a'), makeToken(':='), makeToken('2')
      ];
      const { points, verifyAllHit } = ReachPoint.makeCollection(3);
      const [pt1, pt2, pt3] = points();
      const foundOperators: string[] = [];
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((op: string, _1: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
          foundOperators.push(op);
          pt1.hitsAtExactly(1);
          lhs.visit(visitor);
          rhs.visit(visitor);
        }).
        visitLetDeclaration((_0: AstLetDeclarationNode, rhs: AstNode) => {
          pt2.hitsAtExactly(1);
          rhs.visit(visitor);
        }).
        visitIdentifier((node: AstFringeNode) => {
          expect(node.asString()).toEqual('a');
          pt3.hitsAtExactly(1);
        }).
        finish();
      buildAst().visit(visitor);
      expect(foundOperators).toEqual([':=']);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('builds ast with multiple operators', () => {
      tokens = [
        makeToken('let'), makeToken('a'), makeToken(':='),
        makeToken('2'), makeToken('+'), makeToken('3')
      ];
      const foundOperators: string[] = [];
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((op: string, _1: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
          foundOperators.push(op);
          lhs.visit(visitor);
          rhs.visit(visitor);
        }).
        finish();
      buildAst().visit(visitor);
      expect(foundOperators).toEqual([':=', '+']);
    });

    it('builds ast with multiple lines end on an unary operator', () => {
      tokens = [
        makeToken('a'),
        makeToken('\n'),
        makeToken('let'), makeToken('a'), makeToken(':='), makeToken('2')
      ];
      const rootNode = buildAst();
      if (rootNode.type() !== AstNode.types.tuple) {
        return fail();
      }
      expect((rootNode as AstTupleNode).count()).toEqual(2);
    });

    it('builds ast with multiple lines of unary operators', () => {
      tokens = [
        makeToken('let'), makeToken('b'), makeToken(':='), makeToken('2'),
        makeToken('\n'),
        makeToken('let'), makeToken('a'), makeToken(':='), makeToken('2'),
        makeToken('\n'),
        makeToken('a')
      ];
      const rootNode = buildAst();
      if (rootNode.type() !== AstNode.types.tuple) {
        return fail();
      }
      expect((rootNode as AstTupleNode).count()).toEqual(3);
    });
  });
});
