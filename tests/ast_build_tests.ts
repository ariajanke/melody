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
import { AstFunctionDefinitionNode } from '../src/ast_function_definition_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstBuild }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;

  function makeBuildAst(tokens: () => Token[]) {
    return () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens()));
  }

  describe('builds a mutli-line ast', () => {
    let tokens: Token[] = [];
    const buildAst = makeBuildAst(() => tokens);

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
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      tokens = [
        makeToken('\n'),
        makeToken('a'), makeToken(','), makeToken('b'), makeToken('\n'),
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];

      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(1);
          node.arguments.forEach((node: AstNode) => {
            node.visit(visitor);
          });
        }).
        finish();

      buildAst().visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('builds ast with arthimetic', () => {
      tokens = [
        makeToken('2'), makeToken('+'), makeToken('2')
      ];

      let vop = '';
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
          const { valueOf } = AstIntegerLiteralNode;
          vop = node.operation();
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
        visitBinaryOperation((node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
          foundOperators.push(node.operation());
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
        visitBinaryOperation((node: AstBinaryOperatorNode, lhs: AstNode, rhs: AstNode) => {
          foundOperators.push(node.operation());
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
      if (rootNode.type() !== AstNode.types.functionDefinition) {
        return fail();
      }
      expect((rootNode as AstFunctionDefinitionNode).count()).toEqual(2);
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

  function includeAllNIdentifiers(astRes: () => AstNode, identifiers: string[]) {
    it(`includes all ${identifiers.length} identifiers, in correct order`, () => { 
      const identifiers: string[] = [];
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitIdentifier((node: AstFringeNode) => {
          identifiers.push(node.asString());
        }).
        finish();
      const rootNode = astRes();
      rootNode.visit(visitor);
      // order dependant
      expect(identifiers).toEqual(identifiers);
    });

  }

  describe('a + b + c', () => {
    const tokens: Token[] = [
      makeToken('a'), makeToken('+'), makeToken('b'), makeToken('+'),
      makeToken('c')
    ];
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    includeAllNIdentifiers(buildAst, ['a', 'b', 'c']);

    it('includes two operators', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((node: AstBinaryOperatorNode) => {
          hitsAtExactly(2);
          node.visitChildren(visitor);
        }).
        finish();
      const rootNode = buildAst();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('let a := b', () => {
    const buildAst = makeBuildAst(() => [
      makeToken('let'), makeToken('a'), makeToken(':='), makeToken('1')
    ]);

    includeAllNIdentifiers(buildAst, ['a', 'b']);

    it('includes one ":=" operators', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((node: AstBinaryOperatorNode) => {
          hitsAtExactly(1);
          expect(node.operation()).toEqual(':=');
          node.visitChildren(visitor);
        }).
        finish();
      const rootNode = buildAst();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('\\naskString()', () => {
    const buildAst = makeBuildAst(() => [
      makeToken('\n'),
      makeToken('askString'), makeToken('('), makeToken(')'), makeToken('\n')
    ]);

    it('builds single function call node', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(1);
          expect(node.name).toEqual('askString');
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('function call node takes no arguments', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(1);
          expect(node.arguments.count()).toEqual(0);
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('puts(a, b)\\n', () => {
    const tokens = [
      makeToken('puts'), makeToken('('), makeToken('a'), makeToken(','),
      makeToken('b'),
      makeToken(')'), makeToken('\n')
    ];
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it('creates a function node', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((_0: AstFunctionCallNode) => {
          hitsAtExactly(1);
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('creates a function node with name "puts"', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(1);
          expect(node.name).toEqual('puts');
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('passes two arguments to puts call', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(1);
          expect(node.arguments.count()).toEqual(2);
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  // something need to be re-thought of before I proceed with function blocks
  // likely let statements
  describe('with function blocks', () => {
    const tokens = [
      // 0 ,  1 , 2   , 3   , 4
      'let', 'a', ':=', 'fn', '\n',
      // 5  , 6  , 7        , 8  , 9
      'puts', '(', `'hello'`, ')', '\n',
      //10, 11
      '~', '\n',
      // 12, 13, 14, 15
      'queue', '(', 'a', ')'
    ].map(makeToken);
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it('has two references to variable "a"', () => {
      let aCount = 0;
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitLetDeclaration((_0: AstLetDeclarationNode, node: AstNode) => {
          debugger;
          
          node.visit(visitor);
        }).
        visitIdentifier((node: AstFringeNode) => {
          if (node.asString() === 'a') {
            ++aCount;
          }
        }).
        finish();
      rootNode.visit(visitor);
      expect(aCount).toEqual(2);
    });

    it('has a correctly named let declaration', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitLetDeclaration((_0: AstLetDeclarationNode, decNode: AstNode) => {
          hitsAtExactly(1);
          expect(decNode.asString()).toEqual('a');
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('has a function definition', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionDefinition((_0: AstFunctionDefinitionNode, _1: AstNode[]) => {
          hitsAtExactly(1);
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    fit('queue call is outside the function definition', () => {
      let insideDef = false;
      const rootNode = buildAst();
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionDefinition((_0: AstFunctionDefinitionNode, lineNodes: AstNode[]) => {
          insideDef = true;
          lineNodes.forEach((node: AstNode) => node.visit(visitor));
          insideDef = false;
        }).
        visitIdentifier((node: AstFringeNode) => {
          if (insideDef) {
            expect(node.asString()).not.toEqual('queue');
          } else if (node.asString() === 'queue') {
            hitsAtExactly(1);
          }
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('single line ast', () => {
    let tokens: Token[] = [];
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    const exactlyOneFunctionCallNamed = (fnname: string) => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(1);
          expect(node.name).toEqual(fnname);
          expect(node.arguments.count()).toEqual(0);
        }).
        finish();
      rootNode.visit(visitor);
      return verifyHit();
    };

    it('builds a simple function call', () => {
      tokens = [
        makeToken('\n'),
        makeToken('askString'), makeToken('('), makeToken(')'), makeToken('\n')
      ];
      expect(exactlyOneFunctionCallNamed('askString')).toBeTruthy();
    });

    // trys to "let a := ()"
    it('"let a := askString()"', () => {
      tokens = [
        makeToken('let'), makeToken('a'), makeToken(':='),
        makeToken('askString'), makeToken('('), makeToken(')')
      ];

      expect(exactlyOneFunctionCallNamed('askString')).toBeTruthy();
    });

    it('"puts(askString())"', () => {
      tokens = [
        makeToken('puts'), makeToken('('),
        makeToken('askString'), makeToken('('), makeToken(')'),
        makeToken(')')
      ];

      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const fnnames: string[] = [];
      const kExpectArgumentCount = Object.freeze({
        askString: 0,
        puts: 1
      });
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(2);
          fnnames.push(node.name);
          expect(node.arguments.count()).
            toEqual(kExpectArgumentCount[node.name]);
          node.arguments.forEach((node: AstNode) => node.visit(visitor));
        }).
        finish();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
      expect(fnnames.sort()).toEqual(['askString', 'puts']);
    });

    it('puts(2 + 3, 5 + 9)', () => {
      tokens = [
        makeToken('puts'), makeToken('('),
        makeToken('2'), makeToken('+'), makeToken('3'), makeToken(','),
        makeToken('5'), makeToken('+'), makeToken('9'),
        makeToken(')')
      ];

      const { verifyAllHit, points } = ReachPoint.makeCollection(3);
      const [pt1, pt2, pt3] = points();
      const { binaryOperator } = AstNode.types;
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitBinaryOperation((node: AstBinaryOperatorNode) => {
          pt2.hitsAtExactly(2);
          expect(node.operation()).toEqual('+');
        }).
        visitFunctionCall((node: AstFunctionCallNode) => {
          expect(node.name).toEqual('puts');
          pt3.hitsAtExactly(1);
          node.arguments.forEach((node: AstNode) => {
            expect(node.type()).toEqual(binaryOperator);
            pt1.hitsAtExactly(2);
            node.visit(visitor);
          });
        }).
        finish();
      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('puts(askString(), askString())', () => {
      // more sees puts(askString()), askString()
      // 0.) tpb -> frg -> st frg
      // 1.) cont af frg -> grp
      // 2.) st grp
      // 3.) tpb -> frg -> st frg
      // 4.) con af frg -> grp
      // 5.) st grp
      // 6.) tpb
      // 7.) con af frg
      // 8.) con af op
      // 9.) con af frg
      // 10.) st grp
      // 11.) tpb
      // FINISH
      tokens = [
        makeToken('puts'), makeToken('('),
        makeToken('askString'), makeToken('('), makeToken(')'), makeToken(','),
        makeToken('askString'), makeToken('('), makeToken(')'),
        makeToken(')')
      ];
      const { verifyAllHit, points } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();

      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          expect(node.name).toEqual('puts');
          pt1.hitsAtExactly(1);
          node.arguments.forEach((node: AstNode) => {
            const { functionCall } = AstNode.types;
            expect(node.type()).toEqual(functionCall);
            if (node.type() === functionCall) {
              pt2.hitsAtExactly(2);
              expect((node as AstFunctionCallNode).name).toEqual('askString');
            }
          });
        }).
        finish();
      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it(`puts(('hello'))`, () => {
      tokens = [
        makeToken('puts'), makeToken('('), makeToken('('),
        makeToken(`'hello'`), makeToken(')'), makeToken(')')
      ];

      const pt1 = ReachPoint.make();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          expect(node.name).toEqual('puts');
          pt1.hitsAtExactly(1);
          node.arguments.forEach((node: AstNode) => {
          });
        }).
        finish();
      buildAst().visit(visitor);
      expect(pt1.verifyHit()).toBeTruthy();
    });
  });
});
