import { ReachPoint, TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { IastNode } from '../src/iast_node';
import {
  DastBuild,
  DastLetDeclationMany,
  DastLetDeclations,
  DastLetDeclationSingle,
  DastNode,
  DastVisitor,
  ReseatableDastVisitor
} from '../src/dast_build';
import { Helpers } from '../src/helpers';

const { describeNamed } = TestHelpers;
const { memoize } = Helpers;

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
    const dbuild = DastBuild.make(root);
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

    function namesOfDefs(defs: DastLetDeclations) {
      return defs.map(def => (def as DastLetDeclationSingle)?.name ??
                             (def as DastLetDeclationMany)?.names.join(','));
    }

    it('visits a function definition twice', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      
      let depth = 0;
      visitDnode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastLetDeclations, nodes: Readonly<DastNode[]>) {
          if (depth === 0) {
            expect(namesOfDefs(defs)).toEqual(['b']);
          } else if (depth === 1) {
            expect(namesOfDefs(defs)).toEqual([]);
          } else {
            throw new Error('visited function definition at too great a depth');
          }
          // once: top level function definition with "b"
          // once      : nested function definition on "nodes" side
          // once again: nested function definition on "defs" side
          hitsAtExactly(3);
          ++depth;
          defs[0]?.value?.visit(this);
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
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs.length).toEqual(1);
          const def = defs[0];
          expect(def.dependeeNames.length).toEqual(0);
          expect(def.operator).toEqual('=');
          expect((def as DastLetDeclationSingle).name).toEqual('a');
        }
      });
      expect(verifyHit()).toBeTruthy();
    });
    // do defs contain an "a"
    // does this def contain no dependee names?
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
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect((defs[0] as DastLetDeclationSingle).name).toEqual('b');
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('contains a definition which depends on "a"', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs[0].dependeeNames).toEqual(['a']);
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
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect(defs.length).toEqual(2);
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('seperate definitions contains correct names', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          const names = defs.map(def => (def as DastLetDeclationSingle)?.name).sort();
          expect(names).toEqual(['a', 'b']);
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('contains seperate initial sets', () => {
      const namesFound: string[] = [];
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitInitialSet(names: readonly string[] | string, _1: DastNode) {
          if (typeof names === 'string') {
            namesFound.push(names);
          }
        }
      });
      expect(namesFound.sort()).toEqual(['a', 'b']);
    });
  });

  describe('For fragment "let (a, b) = t"', () => {
    const abtuple = makeTuple([makeFringe('a'), makeFringe('b')]);
    const root = memoize(() =>
      makeTopNodes(makeCall(makeToken('='), abtuple, makeFringe('t'))));
    const visitDNode = makeVisitDNode(root);

    it('contains two seperate definitions', () => {
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          hitsAtExactly(1);
          expect((defs[0] as DastLetDeclationMany).names.length).toEqual(2);
        }
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('contains a single initial set', () => {
      const namesFound: string[] = [];
      const { hitsAtExactly, verifyHit } = ReachPoint.make();
      visitDNode({
        ...DastVisitor.makeDefaultingToContinue(),
        visitInitialSet(names: readonly string[] | string, _1: DastNode) {
          hitsAtExactly(1);
          if (typeof names === 'object') {
            namesFound.push(...names);
          }
        }
      });
      expect(namesFound.sort()).toEqual(['a', 'b']);
      expect(verifyHit()).toBeTruthy();
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
        visitFunctionDefinition(defs: DastLetDeclations, _1: Readonly<DastNode[]>) {
          names.push(...defs.map(def => (def as DastLetDeclationSingle).name));
        }
      });
      expect(names).toEqual(['a', 'b']);
    });
  });
});
