import { AstBuild } from '../../src/vast_build/ast_build';
import { ReachPoint, TestHelpers } from '../test_helpers';
import { Token } from '../../src/token';
import { AstNode } from '../../src/vast_build/ast_node';
import { AstFunctionCallNode } from '../../src/vast_build/ast_function_call_node';
import { AstIntegerLiteralNode } from '../../src/vast_build/ast_integer_literal_node';
import { AstLetDeclarationNode } from '../../src/vast_build/ast_let_declaration_node';
import { AstFringeNode } from '../../src/vast_build/ast_fringe_node';
import { TokenRange } from '../../src/token_range';
import { AstNodeVisitorBuilder } from '../../src/vast_build/ast_node_visitor';
import { AstFunctionDefinitionNode } from '../../src/vast_build/ast_function_definition_node';
import { AstTupleNode } from '../../src/vast_build/ast_tuple_node';
import { AstIdentifierNode } from '../../src/vast_build/ast_identifier_node';

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
        visitFunctionCall((node: AstFunctionCallNode, rec: AstNode, fArgs: AstTupleNode) => {
          vop = node.alwaysAsName();
          
          expect(Number(rec.asString())).toEqual(2);
          expect(fArgs.count()).toEqual(1);
          fArgs.forEach((_0: AstNode) => {
            expect(Number(rec.asString())).toEqual(2);
          });
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
        visitFunctionCall((node: AstFunctionCallNode, rec: AstNode, fArgs: AstTupleNode) => {
          foundOperators.push(node.alwaysAsName());
          pt1.hitsAtExactly(1);
          rec.visit(visitor);
          fArgs.forEach((node: AstNode) => {
            node.visit(visitor);
          });
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
        visitFunctionCall((node: AstFunctionCallNode, rec: AstNode, fArgs: AstTupleNode) => {
          foundOperators.push(node.alwaysAsName());
          rec.visit(visitor);
          fArgs.forEach((node: AstNode) => node.visit(visitor));
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
      if (!AstFunctionDefinitionNode.hasCreated( rootNode )) {
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
      if (!AstFunctionDefinitionNode.hasCreated( rootNode )) {
        return fail();
      }
      expect((rootNode as AstFunctionDefinitionNode).count()).toEqual(3);
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
        visitFunctionCall((_0: AstFunctionCallNode, rec: AstNode, fArgs: AstTupleNode) => {
          hitsAtExactly(2);
          rec.visit(visitor);
          fArgs.forEach((node: AstNode) => node.visit(visitor));
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
        visitFunctionCall((node: AstFunctionCallNode, rec: AstNode, fArgs: AstTupleNode) => {
          hitsAtExactly(1);
          expect(node.alwaysAsName()).toEqual(':=');
          rec.visit(visitor);
          fArgs.forEach((node: AstNode) => node.visit(visitor));
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
          expect(node.alwaysAsName()).toEqual('askString');
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
          expect(node.alwaysAsName()).toEqual('puts');
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

  describe('with function blocks', () => {
    const tokens = [
      'let', 'a', ':=', 'fn', '\n',
      'puts', '(', `'hello'`, ')', '\n',
      '~', '\n',
      'queue', '(', 'a', ')'
    ].map(makeToken);
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it('has two references to variable "a"', () => {
      let aCount = 0;
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitLetDeclaration((_0: AstLetDeclarationNode, node: AstNode) => {
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
      let inLet = false;
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitLetDeclaration((_0: AstLetDeclarationNode, decNode: AstNode) => {
          inLet = true;
          decNode.visit(visitor);
          inLet = false;
        }).
        visitFunctionCall((_0: AstFunctionCallNode, rec: AstNode, _1: AstTupleNode) => {
          if (!inLet) { return; }

          hitsAtExactly(1);
          expect(rec.asString()).toEqual('a');
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

    it('queue call is outside the function definition', () => {
      const rootNode = buildAst();
      const { points, verifyAllHit } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      const functionCalls: string[] = [];
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionDefinition((_0: AstFunctionDefinitionNode, lineNodes: AstNode[]) => {
          lineNodes.forEach((node: AstNode) => node.visit(visitor));
        }).
        visitIdentifier((node: AstFringeNode) => {
          // 'puts' and 'queue' will both hit context once
          if (node.asString() === '<context>') {
            pt2.hitsAtExactly(2);
            return;
          }
          expect(node.asString()).toEqual('a');
          pt1.hitsAtExactly(2);
        }).
        visitFunctionCall((node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode): void => {
          functionCalls.push(node.alwaysAsName());
          receiver.visit(visitor);
          fArgs.forEach((node: AstNode) => node.visit(visitor));
        }).
        finish();
      rootNode.visit(visitor);
      expect(functionCalls).toEqual([':=', 'puts', 'queue']);
      expect(verifyAllHit()).toBeTruthy();
    });
  });

  describe('single line ast', () => {
    let tokens: Token[] = [];
    const buildAst = () => AstBuild.buildFor(TokenRange.makeStartingRange(tokens));

    const expectFunctionsCalledInOrder = (...names: string[]) => {
      const gottenNames: string[] = [];
      const rootNode = buildAst();
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode) => {
          gottenNames.push(node.alwaysAsName());
          receiver.visit(visitor);
          fArgs.forEach((node: AstNode) => node.visit(visitor));
        }).
        finish();
      rootNode.visit(visitor);
      expect(gottenNames).toEqual(names);
    };

    it('builds a simple function call', () => {
      tokens = [
        makeToken('\n'),
        makeToken('askString'), makeToken('('), makeToken(')'), makeToken('\n')
      ];
      expectFunctionsCalledInOrder('askString');
    });

    it('"let a := askString()"', () => {
      tokens = [
        makeToken('let'), makeToken('a'), makeToken(':='),
        makeToken('askString'), makeToken('('), makeToken(')')
      ];

      expectFunctionsCalledInOrder(':=', 'askString');
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
      const kExpectArgumentCount: { [fnName: string]: number } = Object.freeze({
        askString: 0,
        puts: 1
      });
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode) => {
          hitsAtExactly(2);
          fnnames.push(node.alwaysAsName());
          expect(node.arguments.count()).
            toEqual(kExpectArgumentCount[node.alwaysAsName()]);
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
      const visitor = AstNodeVisitorBuilder.
        makeDefaultingToContinue().
        visitFunctionCall((node: AstFunctionCallNode, rec: AstNode, fArgs: AstTupleNode) => {
          if (rec.type() === AstIdentifierNode.type()) {
            expect(node.alwaysAsName()).toEqual('puts');
            pt3.hitsAtExactly(1);
          } else {
            expect(node.alwaysAsName()).toEqual('+');
            pt2.hitsAtExactly(2);
            expect(rec.type()).toEqual(AstIntegerLiteralNode.type());// AstNode.types.integerLiteral);
            fArgs.forEach((node: AstNode) => {
              expect(node.type()).toEqual(AstIntegerLiteralNode.type());// AstNode.types.integerLiteral); //binaryOperator);
              pt1.hitsAtExactly(2);
            });
          }
          fArgs.forEach((node: AstNode) => {
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
          expect(node.alwaysAsName()).toEqual('puts');
          pt1.hitsAtExactly(1);
          node.arguments.forEach((node: AstNode) => {
            // const { functionCall } = AstNode.types;
            const functionCall = AstFunctionCallNode.type();
            expect(node.type()).toEqual(functionCall);
            if (node.type() === functionCall) {
              pt2.hitsAtExactly(2);
              expect((node as AstFunctionCallNode).alwaysAsName()).toEqual('askString');
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
          expect(node.alwaysAsName()).toEqual('puts');
          pt1.hitsAtExactly(1);
        }).
        finish();
      buildAst().visit(visitor);
      expect(pt1.verifyHit()).toBeTruthy();
    });
  });
});
