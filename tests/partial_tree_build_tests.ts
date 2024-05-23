import { LineContinuationScheme, PartialTreeBuild } from '../src/partial_tree_build';
import { TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenCollection } from '../src/tokenization';
import { AstNode } from '../src/ast_node';
import { AstIdentifierNode, AstStringableNode } from '../src/ast_stringable_node';
// import { StartGroupCombiner } from '../src/partial_tree_start_group_build';
import { AstBuild } from '../src/ast_build';
import { EmptyNodeExpansion, NodeExpansion, NodeExpansionVisitor } from '../src/node_expansion';
import { IncompleteNode } from '../src/ast_incomplete_binary_node';
import { AstTupleNode } from '../src/ast_tuple_node';
import { AstFunctionCallNode } from '../src/ast_function_call_node';

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

  function setupWithLeftPartCompletingTupleNode
    (ptbRes: () => NodeExpansion | undefined, fn: (node: AstTupleNode) => void)
  {
    ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
      makeOverrider(fail).
      visitLeftWithNode((node: IncompleteNode, _1: PartialTreeBuild) => {
        const compl = node.finish(AstIdentifierNode.make('b'));
        if (compl.type() === AstNode.types.tuple) {
          fn(compl as AstTupleNode);
        } else {
          fail();
        }
      }).
      visitRightPartOnly((_0: PartialTreeBuild) => {}).
      finish());
  }


  describe('handles general operator case "a, b"', () => {
    const args = [makeToken('a'), makeToken(','), makeToken('b')];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    it('left part has incomplete node', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftWithNode((_0: IncompleteNode, _1: PartialTreeBuild) =>
          pt1.hitsAtExactly(1)).
        visitRightPartOnly((_0: PartialTreeBuild) => {
          pt2.hitsAtExactly(1);
        }).
        finish());
      verifyAllHit();
    });

    it('left part incomplete node, completes into a tuple node', () => {
      setupWithLeftPartCompletingTupleNode(ptbRes, (node: AstTupleNode) => {
        expect(node.count()).toEqual(2);
      });
    });

    it('left part incomplete node, completes into a tuple node, first is an "a" identifer', () => {
      setupWithLeftPartCompletingTupleNode(ptbRes, (node: AstTupleNode) => {
        let first: string | undefined = undefined;
        node.forEach((node: AstNode) => {
          first ??= AstStringableNode.downcast(node).asString();
        });
        expect(first).toEqual('a');
      });
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

    includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);

    it('has left side has incomplete node, has new line adjusted range', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftWithNode((_0: IncompleteNode, part: PartialTreeBuild) => {
          const { start, end } = part.range();
          expect(start).toEqual(3);
          expect(end).toEqual(6);
        }).
        visitRightPartOnly((_0: PartialTreeBuild) => {}).
        finish());
    });

    it('has right side, has new line adjusted range', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftWithNode((_0: IncompleteNode, _1: PartialTreeBuild) => {}).
        visitRightPartOnly((rightPart: PartialTreeBuild) => {
          const { start, end } = rightPart.range();
          expect(start).toEqual(6);
          expect(end).toEqual(6);
        }).
        finish());
    });
  });

  function includeHasLeftSideIncompleteNodeRightSidePartOnly
    (ptbRes: () => NodeExpansion | undefined)
  {
    it('has left side has incomplete node, and nodeless right side', () => {
      const { points, verifyAllHit } = ReachPoint.makeCollection(2);
      const [pt1, pt2] = points();
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftWithNode((_0: IncompleteNode, _1: PartialTreeBuild) =>
          pt1.hitsAtExactly(1)).
        visitRightPartOnly((_0: PartialTreeBuild) => {
          pt2.hitsAtExactly(1);
        }).
        finish());
      verifyAllHit();
    });
  }

  describe('handles function call case "f(...)..."', () => {
    describe('a simple one parameter function call "f(\'a\')"', () => {
      const args =
        [
          makeToken('f'), makeToken('('), makeToken("'a'"), makeToken(')')
        ];
      const ptbRes = () => makePtbRes(...args);

      includeHasAResultExample(ptbRes);

      includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);

      it('has left side whose incomplete node that completes into a function', () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
          makeOverrider(fail).
          visitLeftWithNode((node: IncompleteNode, _1: PartialTreeBuild) => {
            const completed = node.finish(AstIdentifierNode.make('c'));
            expect(completed.type()).toEqual(AstNode.types.functionCall);
          }).
          visitRightPartOnly((_0: PartialTreeBuild) => {}).
          finish());
      });

      it('has left side whose incomplete node that completes into the correct function', () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
          makeOverrider(fail).
          visitLeftWithNode((node: IncompleteNode, _1: PartialTreeBuild) => {
            const completed = node.finish(AstIdentifierNode.make('c'));
            if (completed.type() !== AstNode.types.functionCall) {
              fail();
              return;
            }
            expect((completed as AstFunctionCallNode).name).toEqual('f');
          }).
          visitRightPartOnly((_0: PartialTreeBuild) => {}).
          finish());
      });

      it('has left side, with one token', () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
          makeOverrider(fail).
          visitLeftWithNode((_0: IncompleteNode, part: PartialTreeBuild) => {
            const { start, end } = part.range();
            expect(end - start).toEqual(1);
          }).
          visitRightPartOnly((_0: PartialTreeBuild) => {}).
          finish());
      });

      it('has empty right side', () => {
        ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
          makeOverrider(fail).
          visitLeftWithNode((_0: IncompleteNode, _1: PartialTreeBuild) => {}).
          visitRightPartOnly((rightPart: PartialTreeBuild) => {
            const { start, end } = rightPart.range();
            expect(start).toEqual(end);
          }).
          finish());
      });
    });
  });

  describe('let declaration', () => {
    const args =
      [
        makeToken('let'), makeToken('a'), makeToken('='), makeToken("'hello'")
      ];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    includeHasLeftSideIncompleteNodeRightSidePartOnly(ptbRes);

    it('has left side whose incomplete node that completes into a let', () => {
      ptbWithVisitor(ptbRes, () => NodeExpansionVisitor.
        makeOverrider(fail).
        visitLeftWithNode((node: IncompleteNode, _1: PartialTreeBuild) => {
          const completed = node.finish(AstIdentifierNode.make('c'));
          expect(completed.type()).toEqual(AstNode.types.letDeclaration);
        }).
        visitRightPartOnly((_0: PartialTreeBuild) => {}).
        finish());
    });
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
