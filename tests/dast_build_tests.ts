import { ReachPoint, TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { IastNode } from '../src/iast_node';
import {
  DastBuild,
  
  
  DastFunctionNameMappings,
  DastNode,
  DastVisitor,
  ReseatableDastVisitor
} from '../src/dast_build';
import { Helpers, StandardError } from '../src/helpers';

const { describeNamed } = TestHelpers;
const { memoize, freeze } = Helpers;

describeNamed({ DastBuild }, () => {
  // What's my goals with testing here?
  // Simply is this good enough to support being built upon?
  //
  // test declaration presence
  // test initialSet presence
  const makeToken = Token.forTesting.makeFromStringOnly;
  const makeFringe = (v: string) => IastNode.makeFringe(makeToken(v));
  const { makeCall, makeLetDeclation } = IastNode.forOperativeStatements;
  const { makeTuple } = IastNode.forLetDeclarationRetrievals;
  function intoDastNode(root: IastNode): DastNode {
    const dbuild = DastBuild.make(root, undefined, (root: DastNode) =>
      freeze({ node: () => root, error: () => StandardError.make().error() }));
    const dnode = dbuild.node();
    if (!dnode) {
      throw new Error(dbuild.error().message);
    }
    return dnode;
  }

  function makeVisitDNode(rootFn: () => IastNode) {
    const dnode = () => intoDastNode(rootFn());
    return (visitor: ReseatableDastVisitor) => {
      visitor.setInstRef(visitor);
      dnode().visit(visitor);
    };
  }

  const { makeFunctionDefinition } = IastNode;

  function makeTopNodes(innerNode: IastNode) {
    return makeFunctionDefinition([makeLetDeclation(innerNode)]);
  }

  function namesOfDefs(defs: DastFunctionNameMappings) {
    return Object.keys(defs.declaredNames);
  }

  describe('For fragment with a function defintion but no let declarations', () => {
    // equivalent to:
    // let b = fn a
    const root = memoize(() => makeFunctionDefinition([
      makeLetDeclation(makeCall(
        makeToken('='),
        makeFringe('b'),
        makeFunctionDefinition([makeFringe('a')]))
      )
    ]));
    const visitDnode = makeVisitDNode(root);

    it('visits a function definition twice', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      
      let depth = 0;
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>) {
          if (depth === 0) {
            expect(namesOfDefs(defs).sort()).
              toEqual(['.b', '<initSet>:(b)']);
          } else if (depth === 1) {
            expect(namesOfDefs(defs)).toEqual([]);
          } else {
            throw new Error('visited function definition at too great a depth');
          }
          // once: top level function definition with "b"
          // once      : nested function definition on "nodes" side
          // once again: nested function definition on "defs" side
          hitsAtExactly(2);
          ++depth;
          defs.declaredNames['b']?.value?.visit(this);
          nodes.forEach(node => node.visit(this));
          --depth;
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('For fragment "let a = 1"', () => {
    const root = memoize(() =>
      makeTopNodes(makeCall(makeToken('='), makeFringe('a'), makeFringe('1'))));
    const visitDnode = makeVisitDNode(root);

    it('hits initial set with correct name', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitInitialSet(names: readonly string[] | string, _1: DastNode) {
          hitsAtExactly(1);
          expect(names as string).toEqual('a');
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
    
    it('contains a definition for "a"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          const initSet = defs.declaredNames['<initSet>:(a)'];
          expect(initSet?.initialSet).toBeDefined();
          expect(initSet?.initialSet?.variableNames).toEqual(['a']);
          expect(initSet?.initialSet?.dependeeNames).toEqual([]);
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('contains a definition for an accessor', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs.declaredNames['.a']?.accessor).toBeDefined();
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('does not contain a definition for an assignment', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs.declaredNames['a:=']).toBeUndefined();
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
    
    it('has a definition whose value is "1"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          const initSet = defs.declaredNames['<initSet>:(a)'];
          expect(initSet?.value.asString()).toEqual('1');
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('For fragment "let b = a + 1"', () => {
    const ap1 = () => makeCall(makeToken('+'), makeFringe('a'), makeFringe('1'));
    const root = memoize(() =>
      makeTopNodes(makeCall(makeToken('='), makeFringe('b'), ap1())));
    const visitDNode = makeVisitDNode(root);

    it('contains a definition for "b"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs.declaredNames['.b']).toBeDefined();
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('contains a definition which depends on "a"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          const initialSet = defs.declaredNames['<initSet>:(b)']?.initialSet;
          expect(initialSet).toBeDefined();
          expect(initialSet?.dependeeNames).toEqual(['.a']);
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('For fragment "let (a, b) = (1, 2)"', () => {
    const abtuple = makeTuple([makeFringe('a'), makeFringe('b')]);
    const numtuple = makeTuple([makeFringe('1'), makeFringe('2')]);
    const root = memoize(() =>
      makeTopNodes(makeCall(makeToken('='), abtuple, numtuple)));
    const visitDNode = makeVisitDNode(root);

    it('contains two seperate definitions', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs.declaredNames['<initSet>:(a)']).toBeDefined();
          expect(defs.declaredNames['<initSet>:(b)']).toBeDefined();
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    [
      'a',
      'b'
    ].forEach((name: string) => {
      it(`initial set for "${name}" contains the variable name for itself`, () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        visitDNode({
          ...DastVisitor.makeDefaultingToContinue(),
          visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
            hitsAtExactly(1);
            const initSet = defs.declaredNames[`<initSet>:(${name})`]?.initialSet;
            expect(initSet?.variableNames).toEqual([name]);
          }
        });
        expect(verifyHit()).toBeTruthy();
      });
    });
  });

  describe('For fragment "let (a, b) = t"', () => {
    const abtuple = makeTuple([makeFringe('a'), makeFringe('b')]);
    const root = memoize(() =>
      makeTopNodes(makeCall(makeToken('='), abtuple, makeFringe('t'))));
    const visitDNode = makeVisitDNode(root);

    it('contains an initial set which depends on "t"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          const initialSet = defs.declaredNames['<initSet>:(a,b)']?.initialSet;
          expect(initialSet).toBeDefined();
          expect(initialSet?.dependeeNames).toEqual(['.t']);
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    [
      'a',
      'b'
    ].forEach((name: string) => {
      it(`contains an accessor for "${name}"`, () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        visitDNode({
          ...DastVisitor.makeDefaultingToContinue(),
          visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
            hitsAtExactly(1);
            expect(defs.declaredNames[`.${name}`]).toBeDefined();
          }
        });
        expect(verifyHit()).toBeTruthy();
      });

      // must be rewritten for new schema in case of tuple
      it(`contains accessor ".${name}" whose node and rank is correct`, () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        visitDNode({
          ...DastVisitor.makeDefaultingToContinue(),
          visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
            hitsAtExactly(1);
            const accessor = defs.declaredNames[`.${name}`];
            expect(accessor).toBeDefined();
            expect(accessor?.value.asString()).toEqual('t');
            expect(accessor?.accessor).toBeDefined();
            expect(accessor?.accessor?.tupleRank).toEqual(name === 'a' ? 0 : 1);
          }
        });
        expect(verifyHit()).toBeTruthy();
      });
    });
  });

  describe('For multiple lets', () => {
    const aLet = () => makeCall(makeToken('='), makeFringe('a'), makeFringe('1'));
    const bLet = () => makeCall(makeToken('='), makeFringe('b'), makeFringe('2'));
    const root = memoize(() => IastNode.makeFunctionDefinition([
      makeLetDeclation(aLet()),
      makeLetDeclation(bLet())
    ]));
    const visitDNode = makeVisitDNode(root);

    it('contains both definitions', () => {
      const names: string[] = [];
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {

          names.push(...Object.keys(defs.declaredNames));
        }
      });
      expect(names.sort()).
        toEqual(['.a', '.b', '<initSet>:(a)', '<initSet>:(b)'].sort());
    });
  });

  describe('For let declaration with a function', () => {
    const root = memoize(() =>
      makeTopNodes(makeCall(makeToken('='), makeFringe('f'),
        makeFunctionDefinition([]))));
    const visitDNode = makeVisitDNode(root);

    it('contains an initial set which depends on the function definition', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          // we don't expect to see if in the defs, why?
          // because this is a kind of thing to show up when the context is
          // actually built, consider the following case:
          // let f = fn g
          // let h = f
          // ^ note that it's not obvious at DAST time that "h" is a function
          // in this case, when we visit the function definition for g, we won't
          expect(defs.declaredNames['f']).toBeUndefined();
          expect(defs.declaredNames['.f']).toBeDefined();
          expect(defs.declaredNames['<initSet>:(f)']).toBeDefined();
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
  });

  describe('Cross function definition dependencies', () => {
    // just verify the schema
    const f3Let = () =>
      makeLetDeclation(makeCall(
        makeToken('='),
        makeFringe('f3'),
        makeFunctionDefinition([
          // "puts" as a valid pending name?
          makeCall(makeToken('puts'),
                   makeFringe('<context>'),
                   makeFringe(`'hello from f3'`))
        ])));
    const f2Let = () =>
      makeLetDeclation(makeCall(
        makeToken('='),
        makeFringe('f2'),
        makeFunctionDefinition([
          makeCall(makeToken('puts'), makeFringe('<context>'), makeFringe('a'))
        ])));
    const f1Let = () =>
      makeLetDeclation(makeCall(
        makeToken('='),
        makeFringe('f1'),
        makeFunctionDefinition([
          f2Let()
        ])));
    const aLet = () =>
      makeLetDeclation(makeCall(
        makeToken('='),
        makeFringe('a'),
        makeFringe('1')));
    const root = memoize(() => makeFunctionDefinition([aLet(), f1Let(), f3Let()]));
    const visitDNode = makeVisitDNode(root);
    // we expect a "<parent>" in pending names for f1 and f2, but not for f3
    function makeMarkThing() {
      let mark_: string | undefined = undefined;
      return freeze({
        mark: () => mark_,
        markOnEntry(newMark: string, fn: () => void) {
          const oldMark = mark_;
          mark_ = newMark;
          fn();
          mark_ = oldMark;
        }
      });
    }
    function makeMarkThingForVisitor
      (testFn: (defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>) => void)
    {
      const { markOnEntry, mark } = makeMarkThing();
      const visitor = freeze({
        ...DastVisitor.makeDefaultingToContinue(),
        visitInitialSet(namegroup: readonly string[] | string, node: DastNode) {
          namegroup = typeof namegroup === 'string' ? namegroup : namegroup[0];
          markOnEntry(namegroup, () => node.visit(visitor));
        },
        visitFunctionDefinition(defs: DastFunctionNameMappings, nodes: Readonly<DastNode[]>) {
          testFn(defs, nodes);
          nodes.forEach((node: DastNode) => node.visit(visitor));
        }
      });
      return freeze({ visitor, mark });
    }

    it('contains no "<parent>" pending name inside f3', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const { visitor, mark } = makeMarkThingForVisitor(
        (defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) => {
          if (mark() === 'f1') {
            hitsAtExactly(1);
            expect(defs.pendingNames['<parent>']).toBeUndefined();
          }
        });
      visitDNode(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('contains a "<parent>", and ".a" pending names inside f2', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const { visitor, mark } = makeMarkThingForVisitor(
        (defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) => {
          if (mark() === 'f2') {
            hitsAtExactly(1);
            expect(defs.pendingNames['<parent>']).toBeTruthy();
            expect(defs.pendingNames['.a']).toBeTruthy();
          }
        });
      visitDNode(visitor);
      expect(verifyHit()).toBeTruthy();
    });

    it('contains a "<parent>" pending name inside f1', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      const { visitor, mark } = makeMarkThingForVisitor(
        (defs: DastFunctionNameMappings, _2: Readonly<DastNode[]>) => {
          if (mark() === 'f1') {
            hitsAtExactly(1);
            expect(defs.pendingNames['<parent>']).toBeTruthy();
          }
        });
      visitDNode(visitor);
      expect(verifyHit()).toBeTruthy();
    });
  });
});
