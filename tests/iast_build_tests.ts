import { IastBuild } from '../src/iast_build';
import { ReachPoint, TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenRange } from '../src/token_range';
import { IastNode } from '../src/iast_node';
import { TokenFactories } from './token_factories';
import { ReseatableIastVisitor } from './iast_visitor_factories';

const { describeNamed } = TestHelpers;

describeNamed({ IastBuild }, () => {
  const makeToken = TokenFactories.makeFromStringOnly;

  function makeBuildAst(tokens: () => Token[]) {
    return (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens()));
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

      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(_0: Token, _1: IastNode, args: IastNode): void {
          points()[0].hitsAtExactly(2);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

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
      
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(_0: Token, _1: IastNode, args: IastNode): void {
          hitsAtExactly(1);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

      buildAst().visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('builds ast with arthimetic', () => {
      tokens = [
        makeToken('2'), makeToken('+'), makeToken('2')
      ];

      let vop = '<NOT SET>';
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          vop = callName.content();
          
          expect(Number(receiver.asString())).toEqual(2);
          args.visit(visitor);
        },
        visitTuple(nodes: Readonly<IastNode[]>): void {
          expect(nodes.length).toEqual(1);
          expect(Number(nodes[0].asString())).toEqual(2);
        }
      });
      visitor.setInstRef(visitor);

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
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitLet(innerNode: IastNode): void {
          pt2.hitsAtExactly(1);
          innerNode.visit(visitor);
        },
        visitFringe(identifier: Token): void {
          expect(identifier.content()).toEqual('a');
          pt3.hitsAtExactly(1);
        },
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          foundOperators.push(callName.content());
          pt1.hitsAtExactly(1);

          receiver.visit(visitor);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);
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
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          foundOperators.push(callName.content());
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

      buildAst().visit(visitor);
      expect(foundOperators).toEqual([':=', '+']);
    });

    xit('builds ast with multiple lines end on an unary operator', () => {
      tokens = [
        makeToken('a'),
        makeToken('\n'),
        makeToken('let'), makeToken('a'), makeToken(':='), makeToken('2')
      ];
      // const rootNode = buildAst();
      // if (!AstFunctionDefinitionNode.hasCreated( rootNode )) {
      //   return fail();
      // }
      // expect((rootNode as AstFunctionDefinitionNode).count()).toEqual(2);
    });

    xit('builds ast with multiple lines of unary operators', () => {
      tokens = [
        makeToken('let'), makeToken('b'), makeToken(':='), makeToken('2'),
        makeToken('\n'),
        makeToken('let'), makeToken('a'), makeToken(':='), makeToken('2'),
        makeToken('\n'),
        makeToken('a')
      ];
      // const rootNode = buildAst();
      // if (!AstFunctionDefinitionNode.hasCreated( rootNode )) {
      //   return fail();
      // }
      // expect((rootNode as AstFunctionDefinitionNode).count()).toEqual(3);
    });
  });

  function includeAllNIdentifiers(astRes: () => IastNode, identifiers: string[]): void {
    it(`includes all ${identifiers.length} identifiers, in correct order`, () => { 
      const identifiers: string[] = [];
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitFringe(str: Token): void {
          identifiers.push(str.content());
        }
      });
      visitor.setInstRef(visitor);

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
    const buildAst = (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens));

    includeAllNIdentifiers(buildAst, ['a', 'b', 'c']);

    it('includes two operators', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(_0: Token, receiver: IastNode, args: IastNode): void {
          hitsAtExactly(2);
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

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
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          hitsAtExactly(1);
          expect(callName.content()).toEqual(':=');
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

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
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          hitsAtExactly(1);
          expect(callName.content()).toEqual('askString');
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('function call node takes no arguments', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitTuple(nodes: Readonly<IastNode[]>): void {
          hitsAtExactly(1);
          expect(nodes.length).toEqual(0);
        }
      });
      visitor.setInstRef(visitor);

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
    const buildAst = (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it('creates a function node', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(_0: Token, _1: IastNode, _2: IastNode): void {
          hitsAtExactly(1);
        }
      });
      visitor.setInstRef(visitor);
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('creates a function node with name "puts"', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          hitsAtExactly(1);
          expect(callName.content()).toEqual('puts');
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('passes two arguments to puts call', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitTuple(nodes: Readonly<IastNode[]>): void {
          hitsAtExactly(1);
          expect(nodes.length).toEqual(2);
        }
      });
      visitor.setInstRef(visitor);

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
    const buildAst = (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it('has two references to variable "a"', () => {
      let aCount = 0;
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitFringe(v: Token): void {
          if (v.content() === 'a') {
            ++aCount;
          }
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(aCount).toEqual(2);
    });

    it('has a correctly named let declaration', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      let inLet = false;
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitLet(innerNode: IastNode): void {
          inLet = true;
          innerNode.visit(visitor);
          inLet = false;
        },
        visitCall(_0: Token, receiver: IastNode, _2: IastNode): void {
          if (!inLet) { return; }

          hitsAtExactly(1);
          expect(receiver.asString()).toEqual('a');
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('has a function definition', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(_0: Readonly<IastNode[]>): void {
          hitsAtExactly(1);
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('queue call is outside the function definition', () => {
      const rootNode = buildAst();
      const { points, verifyAllHit } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      const functionCalls: string[] = [];
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitFringe(v: Token): void {
          // 'puts' and 'queue' will both hit context once
          if (v.content() === '<context>') {
            pt2.hitsAtExactly(2);
            return;
          }
          expect(v.content()).toEqual('a');
          pt1.hitsAtExactly(2);
        },
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          functionCalls.push(callName.content());
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(functionCalls).toEqual([':=', 'puts', 'queue']);
      expect(verifyAllHit()).toBeTruthy();
    });
  });

  describe('with nested function blocks', () => {
    // regular case will see that close token
    const tokens = [
      'let', 'f1', '=', 'fn', '\n',
      'let', 'f2', '=', 'fn', '\n',
      '~', '\n',
      '~', '\n',
    ].map(makeToken);

    const buildAst = (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens));
    it('builds two nested function definitions', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(nodes: Readonly<IastNode[]>): void {
          hitsAtExactly(3); // including root
          nodes.forEach(node => node.visit(visitor));
        }
      });
      visitor.setInstRef(visitor);

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('single line ast', () => {
    let tokens: Token[] = [];
    const buildAst = (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens));

    const expectFunctionsCalledInOrder = (...names: string[]): void => {
      const gottenNames: string[] = [];
      const rootNode = buildAst();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          gottenNames.push(callName.content());
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });
      visitor.setInstRef(visitor);

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
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, _1: IastNode, args: IastNode): void {
          hitsAtExactly(2);
          fnnames.push(callName.content());
          args.visit(visitor);
        },
        visitTuple(nodes: Readonly<IastNode[]>): void {
          const lastName = fnnames[fnnames.length - 1];
          expect(nodes.length).
            toEqual(kExpectArgumentCount[lastName]);
        }
      });
      visitor.setInstRef(visitor);

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
      let hitInteger = false;
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          if (callName.content() === 'puts') {
            pt3.hitsAtExactly(1);
            args.visit(visitor);
          } else {
            expect(callName.content()).toEqual('+');
            pt2.hitsAtExactly(2);
            hitInteger = false;
            receiver.visit(visitor);
            expect(hitInteger).toBeTruthy();

            hitInteger = false;
            args.visit(visitor);
            expect(hitInteger).toBeTruthy();
          }
        },
        visitInteger(_0: string): void {
          hitInteger = true;
          pt1.hitsAtExactly(4);
        }
      });
      visitor.setInstRef(visitor);

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
      let onArgs = false;
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, _1: IastNode, args: IastNode): void {
          if (onArgs) {
            pt2.hitsAtExactly(2);
            expect(callName.content()).toEqual('askString');
            return;
          }
          expect(callName.content()).toEqual('puts');
          pt1.hitsAtExactly(1);
          onArgs = true;
          args.visit(visitor);
          onArgs = false;
        }
      });
      visitor.setInstRef(visitor);

      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it(`puts(('hello'))`, () => {
      tokens = [
        makeToken('puts'), makeToken('('), makeToken('('),
        makeToken(`'hello'`), makeToken(')'), makeToken(')')
      ];

      const pt1 = ReachPoint.make();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          expect(callName.content()).toEqual('puts');
          pt1.hitsAtExactly(1);
        }
      });
      visitor.setInstRef(visitor);

      buildAst().visit(visitor);
      expect(pt1.verifyHit()).toBeTruthy();
    });

  });

  describe('table expressions', () => {
    let tokens: Token[] = [];
    const buildAst = (): IastNode =>
      IastBuild.buildFor(TokenRange.makeStartingRange(tokens));

    it(`simple.table`, () => {
      tokens = [
        makeToken('simple'), makeToken('.'), makeToken('table')
      ];

      const pt1 = ReachPoint.make();
      const visitor = ({
        ...ReseatableIastVisitor.makeDefaultingToContinue(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          expect(callName.content()).toEqual('.');
          pt1.hitsAtExactly(1);
        }
      });
      visitor.setInstRef(visitor);

      buildAst().visit(visitor);
      expect(pt1.verifyHit()).toBeTruthy();
    });

    it(`nested.table.accessor`, fail);
    it(`nested.table.assignment := 5`, fail);
    it(`nested.foo(a, b).assignment := 5`, fail);
    it(`a(nested.table).assignment := 5`, fail);
    it(`t.foo(let a = 5).assignment := 5`, fail);
    it(`(let a = 5).assignment := 5`, fail);
    it(`(t.actually_okay) := 5`, fail);
    it(`nested.table.equality = 5`, fail);
    it(`nested.table.call('withArg')`, fail);
    it(`vex2d.x + vex2d.y`, fail);
  });
});
