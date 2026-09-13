import { ReachPoint, TestHelpers } from './test_helpers';
import { Token, TokenType } from '../src/token';
import { IastLiteralType, IastNode } from '../src/iast_node';
import { TokenFactories } from './token_factories';
import { ReseatableIastVisitor } from './iast_visitor_factories';
import { IastBuild } from '../src/iast_build';
import { Helpers, raise } from '../src/helpers';
import { OperatorNamingSchema } from '../src/operator_naming_schema';
import { IastHelpers } from './iast_helpers';

const { freeze, memoize } = Helpers;

const { describeNamed } = TestHelpers;

describeNamed({ IastBuild }, () => {
  const makeInstFromStrings = (strs: Readonly<string[]>): () => IastBuild =>
    memoize(() => IastBuild.make(strs.map(makeToken)));
  const callsFromNode = IastHelpers.callsFromInst;
  const idsFromNode = IastHelpers.identifiersFromInst;
  const makeVisitor = ReseatableIastVisitor.makeSelfModified;
  const makeDefaultVisitor = ReseatableIastVisitor.makeDefaultingToContinue;
  const makeToken = TokenFactories.makeFromStringOnly;

  const kCallToken: Token = freeze({
    start  : (): number => raise('!!'),
    end    : (): number => raise('!!'),
    type   : (): TokenType => Token.types.operator,
    content: (): string => OperatorNamingSchema.kCall
  });

  function makeBuildAst(tokens: () => Token[]) {
    return (): IastNode =>
      IastBuild.buildFor(tokens());
  }

  describe('builds a mutli-line ast', () => {
    let tokens: Token[] = [];
    const buildAst = makeBuildAst(() => tokens);

    it('builds two function calls', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(1);
      const kPutsCall = [
        makeToken('puts'), kCallToken, makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n')
      ];
      tokens = [
        ...kPutsCall,
        ...kPutsCall
      ];

      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(_0: Token, _1: IastNode, args: IastNode): void {
          points()[0].hitsAtExactly(2);
          args.visit(visitor);
        }
      });

      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('two lines, operator first, call second', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      tokens = [
        makeToken('\n'),
        makeToken('a'), makeToken(','), makeToken('b'), makeToken('\n'),
        makeToken('puts'), kCallToken, makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];
      
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(_0: Token, _1: IastNode, args: IastNode): void {
          hitsAtExactly(1);
          args.visit(visitor);
        }
      });

      buildAst().visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('builds ast with arthimetic', () => {
      tokens = [
        makeToken('2'), makeToken('+'), makeToken('2')
      ];

      let vop = '<NOT SET>';
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
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
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
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
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          foundOperators.push(callName.content());
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });

      buildAst().visit(visitor);
      expect(foundOperators).toEqual([':=', '+']);
    });

    const letALine = [
      'let', 'a', ':=', '2'
    ] as const;

    it('builds ast with multiple lines end on an unary operator', () => {
      const inst = makeInstFromStrings(['a', '\n', ...letALine]);
      const calls = callsFromNode(inst().node);
      expect(calls).toEqual(['let', ':=']);
    });

    it('builds ast with multiple lines of unary operators', () => {
      const inst = makeInstFromStrings([
        'let', 'b', ':=', '2',
        '\n',
        ...letALine, '\n',
        'a'
      ]);
      const calls = callsFromNode(inst().node);
      expect(calls).toEqual(['let', ':=', 'let', ':=']);
    });
  });

  function includeAllNIdentifiers(astRes: () => IastNode, identifiers: string[]): void {
    it(`includes all ${identifiers.length} identifiers, in correct order`, () => { 
      const identifiers: string[] = [];
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitFringe(str: Token): void {
          identifiers.push(str.content());
        }
      });

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
    const buildAst = (): IastNode => IastBuild.buildFor(tokens);

    includeAllNIdentifiers(buildAst, ['a', 'b', 'c']);

    it('includes two operators', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(_0: Token, receiver: IastNode, args: IastNode): void {
          hitsAtExactly(2);
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });

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

    it('includes a ":=" call', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          hitsAtExactly(1);
          expect(callName.content()).toEqual(':=');
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });

      const rootNode = buildAst();
      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('\\naskString()', () => {
    const buildAst = makeBuildAst(() => [
      makeToken('\n'),
      makeToken('askString'), kCallToken, makeToken('('), makeToken(')'), makeToken('\n')
    ]);

    it('builds single function call node', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          hitsAtExactly(1);
          expect(callName.content()).toEqual('askString');
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('function call node takes no arguments', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitTuple(nodes: Readonly<IastNode[]>): void {
          hitsAtExactly(1);
          expect(nodes.length).toEqual(0);
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('puts(a, b)\\n', () => {
    const tokens = [
      makeToken('puts'), kCallToken, makeToken('('), makeToken('a'), makeToken(','),
      makeToken('b'),
      makeToken(')'), makeToken('\n')
    ];
    const buildAst = (): IastNode => IastBuild.buildFor(tokens);

    it('creates a function node', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(_0: Token, _1: IastNode, _2: IastNode): void {
          hitsAtExactly(1);
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('creates a function node with name "puts"', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          hitsAtExactly(1);
          expect(callName.content()).toEqual('puts');
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('passes two arguments to puts call', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitTuple(nodes: Readonly<IastNode[]>): void {
          hitsAtExactly(1);
          expect(nodes.length).toEqual(2);
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('with function blocks', () => {
    const tokens = [
      'let', 'a', ':=', 'fn', '\n',
      'puts', kCallToken.content(), '(', `'hello'`, ')', '\n',
      '~', '\n',
      'queue', kCallToken.content(), '(', 'a', ')'
    ].map(makeToken);
    const buildAst = (): IastNode => IastBuild.buildFor(tokens);

    it('has two references to variable "a"', () => {
      let aCount = 0;
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitFringe(v: Token): void {
          if (v.content() === 'a') {
            ++aCount;
          }
        }
      });

      rootNode.visit(visitor);
      expect(aCount).toEqual(2);
    });

    it('has a correctly named let declaration', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      let inLet = false;
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
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

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('has a function definition', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitFunctionDefinition(_0: Readonly<IastNode[]>): void {
          hitsAtExactly(1);
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('queue call is outside the function definition', () => {
      const rootNode = buildAst();
      const functionCalls: string[] = [];
      const identifiers: string[] = [];
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitFringe(v: Token): void {
          identifiers.push(v.content());
        },
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          functionCalls.push(callName.content());
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });

      rootNode.visit(visitor);
      expect(functionCalls).toEqual([':=', 'puts', 'queue']);
      expect(identifiers).toEqual(['a', '<context>', '<context>', 'a']);
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
      IastBuild.buildFor(tokens);
    it('builds two nested function definitions', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitFunctionDefinition(nodes: Readonly<IastNode[]>): void {
          hitsAtExactly(3); // including root
          nodes.forEach(node => node.visit(visitor));
        }
      });

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('single line ast', () => {
    let tokens: Token[] = [];
    const buildAst = (): IastNode => IastBuild.buildFor(tokens);

    const expectFunctionsCalledInOrder = (...names: string[]): void => {
      const gottenNames: string[] = [];
      const rootNode = buildAst();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(callName: Token, receiver: IastNode, args: IastNode): void {
          gottenNames.push(callName.content());
          receiver.visit(visitor);
          args.visit(visitor);
        }
      });

      rootNode.visit(visitor);
      expect(gottenNames).toEqual(names);
    };

    it('builds a simple function call', () => {
      tokens = [
        makeToken('\n'),
        makeToken('askString'), kCallToken, makeToken('('), makeToken(')'), makeToken('\n')
      ];
      expectFunctionsCalledInOrder('askString');
    });

    it('let a := askString()', () => {
      tokens = [
        makeToken('let'), makeToken('a'), makeToken(':='),
        makeToken('askString'), kCallToken, makeToken('('), makeToken(')')
      ];

      expectFunctionsCalledInOrder(':=', 'askString');
    });

    it('puts(askString())', () => {
      tokens = [
        makeToken('puts'), kCallToken, makeToken('('),
        makeToken('askString'), kCallToken, makeToken('('), makeToken(')'),
        makeToken(')')
      ];

      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      const rootNode = buildAst();
      const fnnames: string[] = [];
      const kExpectArgumentCount: { [fnName: string]: number } = Object.freeze({
        askString: 0,
        puts: 1
      });
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
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

      rootNode.visit(visitor);
      expect(verifyHit()).toBeTruthy();
      expect(fnnames.sort()).toEqual(['askString', 'puts']);
    });

    it('puts(2 + 3, 5 + 9)', () => {
      tokens = [
        makeToken('puts'), kCallToken, makeToken('('),
        makeToken('2'), makeToken('+'), makeToken('3'), makeToken(','),
        makeToken('5'), makeToken('+'), makeToken('9'),
        makeToken(')')
      ];

      const { verifyAllHit, points } = ReachPoint.makeCollection(3);
      const [pt1, pt2, pt3] = points();
      let hitInteger = false;
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
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
        visitLiteral(_0: Token, type: IastLiteralType): void {
          if (type !== 'number')
            { return; }

          hitInteger = true;
          pt1.hitsAtExactly(4);
        }
      });

      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it('puts(askString(), askString())', () => {
      tokens = [
        makeToken('puts'), kCallToken, makeToken('('),
        makeToken('askString'), kCallToken, makeToken('('), makeToken(')'), makeToken(','),
        makeToken('askString'), kCallToken, makeToken('('), makeToken(')'),
        makeToken(')')
      ];
      const { verifyAllHit, points } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      let onArgs = false;
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
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

      buildAst().visit(visitor);
      expect(verifyAllHit()).toBeTruthy();
    });

    it(`puts(('hello'))`, () => {
      tokens = [
        makeToken('puts'), kCallToken, makeToken('('), makeToken('('),
        makeToken(`'hello'`), makeToken(')'), makeToken(')')
      ];

      const pt1 = ReachPoint.make();
      const visitor = makeVisitor({
        ...makeDefaultVisitor(),
        visitCall(callName: Token, _1: IastNode, _2: IastNode): void {
          expect(callName.content()).toEqual('puts');
          pt1.hitsAtExactly(1);
        }
      });

      buildAst().visit(visitor);
      expect(pt1.verifyHit()).toBeTruthy();
    });

  });

  describe('table access expressions', () => {
    it(`simple.table`, () => {
      const inst = makeInstFromStrings(['simple', '.', 'table']);
      const calls = callsFromNode(inst().node);
      expect(calls).toEqual(['.table']);
    });

    it(`nested.table.accessor`, () => {
      const inst = makeInstFromStrings(['nested', '.', 'table', '.', 'accessor']);
      const calls = callsFromNode(inst().node);
      expect(calls).toEqual(['.accessor', '.table']);
    });

    it(`nested.table.assignment := 5`, () => {
      const inst = makeInstFromStrings([
        'nested', '.', 'table', '.', 'assignment', ':=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      expect(calls).toEqual(['assignment:=', '.table']);
    });

    it(`nested.foo(a, b).assignment := 5`, () => {
      const inst = makeInstFromStrings([
        'nested', '.', 'foo', '<call>', '(', 'a', ',', 'b', ')', '.',
          'assignment', ':=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['assignment:=', 'foo']);
      expect(ids).toEqual(['nested', 'a', 'b']);
    });

    it(`a(nested.table).assignment := 5`, () => {
      const inst = makeInstFromStrings([
        'a', '<call>', '(', 'nested', '.', 'table', ')', '.', 'assignment', ':=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['assignment:=', 'a', '.table']);
      expect(ids).toEqual(['<context>', 'nested']);
    });

    it(`t.foo(let a = 5).assignment := 5`, () => {
      const inst = makeInstFromStrings([
        't', '.', 'foo', '<call>', '(',
          'let', 'a', '=', '5',
        ')', '.', 'assignment', ':=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['assignment:=', 'foo', 'let', '=']);
      expect(ids).toEqual(['t', 'a']);
    });

    it(`(let a = 5).assignment := 5`, () => {
      const inst = makeInstFromStrings([
        '(', 'let', 'a', '=', '5', ')', '.', 'assignment', ':=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['assignment:=', 'let', '=']);
      expect(ids).toEqual(['a']);
    });

    it(`(t.actually_okay) := 5`, () => {
      const inst = makeInstFromStrings([
        '(', 't', '.', 'actually_okay', ')', ':=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['actually_okay:=']);
      expect(ids).toEqual(['t']);
    });

    it(`nested.table.equality = 5`, () => {
      const inst = makeInstFromStrings([
        'nested', '.', 'table', '.', 'equality', '=', '5'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['=', '.equality', '.table']);
      expect(ids).toEqual(['nested']);
    });

    it(`nested.table.call('withArg')`, () => {
      const inst = makeInstFromStrings([
        'nested', '.', 'table', '.', 'call', '<call>', '(', `'withArg'`, ')'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['call', '.table']);
      expect(ids).toEqual(['nested']);
    });

    it(`vex2d.x + vex2d.y`, () => {
      const inst = makeInstFromStrings([
        'vex2d', '.', 'x', '+', 'vex2d', '.', 'y'
      ]);
      const calls = callsFromNode(inst().node);
      const ids = idsFromNode(inst().node);
      expect(calls).toEqual(['+', '.x', '.y']);
      expect(ids).toEqual(['vex2d', 'vex2d']);
    });
  });
});
