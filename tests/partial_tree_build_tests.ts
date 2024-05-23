import { LineContinuationScheme, PartialTreeBuild } from '../src/partial_tree_build';
import { TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenCollection } from '../src/tokenization';
import { AstNode } from '../src/ast_node';
import { AstStringableNode } from '../src/ast_stringable_node';
// import { StartGroupCombiner } from '../src/partial_tree_start_group_build';
import { AstBuild } from '../src/ast_build';
import { EmptyNodeExpansion, NodeExpansion, NodeExpansionVisitor } from '../src/node_expansion';

const { describeNamed } = TestHelpers;

// general cases
// ( \n ... )
// ( a + b ) ...
// a , b ...
// a + \n b ...
// f(...)...
// base cases
// a
// ,
// (
// \n
// <empty>

describeNamed({ PartialTreeBuild }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;
  const { buildProgramSequence } = AstBuild.testable;

  const normalCont = LineContinuationScheme.normal;
  const make = (tokens: Token[]) =>
    PartialTreeBuild.make(TokenCollection.make(tokens), 0, tokens.length, normalCont);
  const makePtbRes = (...tokens: Token[]) =>
    PartialTreeBuild.
      make(TokenCollection.make(tokens), 0, tokens.length, normalCont).
      buildPart();

  const ptbWithVisitor =
    (ptbRes: () => NodeExpansion | undefined,
     fn: () => NodeExpansionVisitor) =>
    { ptbRes()?.visit(fn()); };

  function includeHasAResultExample(ptbRes: () => NodeExpansion | undefined) {
    it('returns a result', () => {
      expect(ptbRes()).toBeDefined();
    });
  }

  // function includeNoNodePtbExamples(ptbRes: () => PartialTreeBuildResult | undefined) {
  //   includeHasAResultExample(ptbRes);

  //   it('has no complete node', () => {
  //     expect(ptbRes()?.completedNode).toBeUndefined();
  //   });

  //   it('has no incomplete node', () => {
  //     expect(ptbRes()?.incompleteNode).toBeUndefined();
  //   });

  //   it('creates a ptb that ignores new lines', () => {
  //     expect(ptbRes()?.unprocessedPart?.ignoresNewLines()).toBeTruthy();
  //   });
  // }

  describe('handles general case "( \\n ..."', () => {
    const args = [makeToken('('), makeToken('\n'), makeToken('a'), makeToken(')')];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    it('is composed of a left and right part only', () => {
      let leftPartCalls = 0;
      let rightPartCalls = 0;
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((_0: PartialTreeBuild) => {
          ++leftPartCalls;
        }).
        visitRightPartOnly((_1: PartialTreeBuild) => {
          ++rightPartCalls;
        }).
        finish());
      expect(leftPartCalls).toEqual(1);
      expect(rightPartCalls).toEqual(1);
    });

    it('makes right part with none of the tokens', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((_0: PartialTreeBuild) => {}).
        visitRightPartOnly((rightPart: PartialTreeBuild) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(4);
          expect(end).toEqual(4);
        }).
        finish());
    });

    it('makes left part with the remainder of the tokens, skipping new line', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((leftPart: PartialTreeBuild) => {
          const { start, end } = leftPart.range();
          expect(start).toEqual(2);
          expect(end).toEqual(3);
        }).
        visitRightPartOnly((_0: PartialTreeBuild) => {}).
        finish());
    });
  });

  interface ReachPoint {
    hitsAtExactly: (times: number) => void,
    verifySatisfied: () => void
  };

  interface ReachPointCollection {
    points: () => ReachPoint[],
    verifyAllHit: () => boolean
  }

  const ReachPoint = (() => {

    function make(mSet: number[], mIdx: number): ReachPoint {
      let mRequiredHits = 1;
      let mName = `Point ${mIdx}`;
      function hitsAtExactly(times: number, name?: string) {
        mRequiredHits = times;
        mSet[mIdx]++;
        if (mSet[mIdx] > times) {
          throw Error(`Reached "${mName} too many times`);
        }
        if (name) {
          mName = name;
        }
      }

      function verifySatisfied() {
        if (mSet[mIdx] !== mRequiredHits) {
          throw Error(`Point "${mName}" was not reached ${mRequiredHits} times`);
        }
      }

      return Object.freeze({ hitsAtExactly, verifySatisfied });
    }

    function makeCollection(size: number): ReachPointCollection {
      const mSet: number[] = [];
      mSet.length = size;
      mSet.fill(0);
      const mPoints: ReachPoint[] = [];
      for (let i = 0; i < size; ++i) {
        mPoints.push(make(mSet, i));
      }
      function points(): ReachPoint[] {
        return mPoints;
      }

      function verifyAllHit(): boolean {
        mPoints.forEach((pt) => { pt.verifySatisfied() });
        return true;
      }

      return Object.freeze({ points, verifyAllHit });
    }

    return Object.freeze({ make, makeCollection })
  })();

  function includeHasLeftAndRightPointWithNoNodes
    (ptbRes: () => NodeExpansion | undefined)
  {
    it('has left and right point with no nodes', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((_0: PartialTreeBuild) => {
          pt1.hitsAtExactly(1);
        }).
        visitRightPartOnly((_0: PartialTreeBuild) => {
          pt2.hitsAtExactly(1);
        }).
        finish());
      expect(verifyAllHit()).toBeTruthy();
    });
  }

  describe('handles grouping case "( a )"', () => {
    const args = [makeToken('('), makeToken('a'), makeToken(')')];
    const ptbRes = () => makePtbRes(...args);

    includeHasLeftAndRightPointWithNoNodes(ptbRes);

    it('has left and right point with no nodes', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((_0: PartialTreeBuild) => {
          pt1.hitsAtExactly(1);
        }).
        visitRightPartOnly((_0: PartialTreeBuild) => {
          pt2.hitsAtExactly(1);
        }).
        finish());
      expect(verifyAllHit()).toBeTruthy();
    });

    it('left part contains no tokens', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((leftPart: PartialTreeBuild) => {
          expect(args[leftPart.range().start].content()).toEqual("a");
        }).
        visitRightPartOnly((_0: PartialTreeBuild) => {}).
        finish());
    });

    it('right part contains the "a" token', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((_0: PartialTreeBuild) => {}).
        visitRightPartOnly((rightPart: PartialTreeBuild) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(end);
        }).
        finish());
    });

    // cover these tests by lone "a" token
    // it('incomplete part builds a complete node', () => {
    //   expect(ptbRes()?.unprocessedPart?.buildPart()?.completedNode).toBeDefined();
    // });

    // it('incomplete part builds an identifier node', () => {
    //   const node = ptbRes()?.unprocessedPart?.buildPart()?.completedNode;
    //   expect(node?.type()).toBeDefined(AstNode.types.identifier);
    // });

    // it('incomplete part builds an "a" stringable node', () => {
    //   const node = ptbRes()?.unprocessedPart?.buildPart()?.completedNode;
    //   const str = node && AstStringableNode.downcast(node).asString();
    //   expect(str).toBeDefined('a');
    // });
  });

  describe('handles grouping case "( a , b )"', () => {
    const args = [
      makeToken('('), makeToken('a'), makeToken(','), makeToken('b'),
      makeToken(')')
    ];
    const ptbRes = () => makePtbRes(...args);

    includeHasLeftAndRightPointWithNoNodes(ptbRes);

    ([
      ['a', 0],
      [',', 1],
      ['b', 2]
    ] as [string, number][]).
      forEach(([token, position]: [string, number]) => {
        it(`left part contains the "${token}" tokens`, () => {
          ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
            makeOverrider(fail).
            visitLeftPartOnly((leftPart: PartialTreeBuild) => {
              const idx = leftPart.range().start + position;
              expect(idx).toBeLessThan(args.length);
              expect(args[idx]?.content()).toEqual(token);
            }).
            visitRightPartOnly((_0: PartialTreeBuild) => {}).
            finish());
        });
      });

    it(`right part contains no tokens`, () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftPartOnly((_0: PartialTreeBuild) => {}).
        visitRightPartOnly((rightPart: PartialTreeBuild) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(end);
        }).
        finish());
    });
  });

  describe('handles general operator case "a, b"', () => {
    const args = [makeToken('a'), makeToken(','), makeToken('b')];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    it('has no complete node', () => {
      expect(ptbRes()?.completedNode).toBeUndefined();
    });

    it('has an incomplete node', () => {
      expect(ptbRes()?.incompleteNode).toBeDefined();
    });

    it('incomplete node maps to correct token', () => {
      expect(ptbRes()?.incompleteNode?.lhsAsString()).toEqual('a');
    });

    it('creates a ptb that ignores new lines', () => {
      expect(ptbRes()?.unprocessedPart?.ignoresNewLines()).toBeTruthy();
    });
  });

  describe('handles case operator across new line "a, \\n b \\n ...', () => {
    const args =
      [
        makeToken('a'), makeToken(','), makeToken('\n'),
        makeToken('b'), makeToken('\n'),
        makeToken('c')
      ];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    it('has no complete node', () => {
      expect(ptbRes()?.completedNode).toBeUndefined();
    });

    it('has an incomplete node', () => {
      expect(ptbRes()?.incompleteNode).toBeDefined();
    });

    // this time more interested in the next completing

    it('remaining part does not ignore new lines', () => {
      expect(ptbRes()?.remainingPart?.ignoresNewLines()).not.toBeTruthy();
    });

    it('unprocessedPart completion', () => {
      const res = ptbRes();
      const unprocessedPart = res?.unprocessedPart;
      const partBuildRes = unprocessedPart?.buildPart();
      const completedNode: AstNode | undefined =
        partBuildRes?.completedNode;
      const tupleNode = completedNode && res?.incompleteNode?.
        finish(completedNode as AstNode);
      expect(tupleNode?.type()).toEqual(AstNode.types.tuple);
    });
  });

  describe('handles function call case "f(...)..."', () => {
    describe('a simple one parameter function call "f(\'a\')"', () => {
      const args =
        [
          makeToken('f'), makeToken('('), makeToken("'a'"), makeToken(')')
        ];
      const ptbRes = () => makePtbRes(...args);

      it('returns an incomplete node, with unprocessed part', () => {
        const res = ptbRes();
        res?.unprocessedPart?.buildPart();
        expect(res?.incompleteNode).toBeDefined();
        expect(res?.unprocessedPart).toBeDefined();
      });

      it('completes unprocessed part into an identifier', () => {
        const res = ptbRes()?.unprocessedPart?.buildPart();
        const stringable = res?.completedNode && AstStringableNode.
          downcast(res?.completedNode);
        expect(stringable?.asString()).toEqual('a');
      });

      it('function has correct name', () => {
        expect(ptbRes()?.incompleteNode?.lhsAsString()).toEqual('f');
      });

      it('completes into a function call', () => {
        const res = ptbRes();
        const node = res?.unprocessedPart?.buildPart()?.completedNode;
        const fCall = node && res?.incompleteNode?.finish(node);
        expect(fCall?.type()).toEqual(AstNode.types.functionCall);
      });
    });

    // describe('parameter given on next line', () => {

    // });

    // describe('multi-argument call', () => {

    // });

  });

  describe('simple cases', () => {
    it('handles a single string literal', () => {
      const ptbRes = () => make([makeToken("'a'")]).buildPart();
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitRightNodeOnly((node: AstNode) => {
          const str = AstStringableNode.downcast(node).asString();
          expect(str).toEqual('a');
        }).
        finish());
    });

    it('handles new lines followed by nothing statements', () => {
      const res = make([makeToken('\n')]).buildPart();
      expect(EmptyNodeExpansion.hasCreated(res)).toBeTruthy();
    });

    it('handles empty statements', () => {
      const res = make([]).buildPart();
      expect(EmptyNodeExpansion.hasCreated(res)).toBeTruthy();
    });

    it('handles a lone token statement', () => {
      const args = [
        makeToken('a'),
        makeToken('\n')
      ];
      const ptbRes = () => make(args).buildPart();
      const { points, verifyAllHit } = ReachPoint.makeCollection(1);
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitRightNodeOnly((node: AstNode) => {
          const str = AstStringableNode.downcast(node).asString();
          points()[0].hitsAtExactly(1);
          expect(str).toEqual('a');
        }).
        finish());
      verifyAllHit();
    });
  });

  // it('handles operator continuing an expression across new line', () => {
  //   const res = make([
  //     makeToken('a'),
  //     makeToken(','),
  //     makeToken('\n'),
  //     makeToken('b')
  //   ]).buildPart();
  // });
});
