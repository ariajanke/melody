import {
  BuildStateAddition,
} from '../../src/ast_build/tree_part_build';
import { TestHelpers, ReachPoint } from '../test_helpers';
import { Token } from '../../src/token';
import { AstNode } from '../../src/ast_node';
import { AstFringeNode } from '../../src/ast_fringe_node';
import { IncompleteNode } from '../../src/ast_incomplete_binary_node';
import { TokenRange } from '../../src/token_range';
import { TreePartBuild } from '../../src/ast_build/tree_part_build';

const { describeNamed } = TestHelpers;

describeNamed({ TreePartBuild }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;

  const make = (tokens: Token[]) =>
    TreePartBuild.make(TokenRange.makeStartingRange(tokens));
  const makePtbRes = (...tokens: Token[]) =>
    TreePartBuild.
      make(TokenRange.makeStartingRange(tokens)).
      build();

  function includeHasAResultExample(ptbRes: () => BuildStateAddition | undefined) {
    it('returns a result', () => {
      expect(ptbRes()).toBeDefined();
    });
  }

  const _viewParts =
    (ptbRes: BuildStateAddition | undefined,
     fn: (...parts: TreePartBuild[]) => void,
     defaultBehavior: () => void): void =>
  {
    const mParts: TreePartBuild[] = [];
    const inst = Object.freeze({
      pushPart: (part: TreePartBuild) => {
        mParts.push(part);
        return inst;
      },
      pushComplete: (_0: AstNode) => {
        defaultBehavior();
        return inst;
      },
      pushIncomplete: (_0: IncompleteNode) => {
        defaultBehavior();
        return inst;
      }
    });
    ptbRes?.pushTo(inst);
    fn(...mParts);
  };

  const viewAll =
    (ptbRes: BuildStateAddition | undefined,
     fn: (parts: TreePartBuild[], nodes: AstNode[], inodes: IncompleteNode[]) => void): void =>
  {
    const mParts: TreePartBuild[] = [];
    const mCompleteNodes: AstNode[] = [];
    const mIncompleteNodes: IncompleteNode[] = [];
    const inst = Object.freeze({
      pushPart: (part: TreePartBuild) => {
        mParts.push(part);
        return inst;
      },
      pushComplete: (node: AstNode) => {
        mCompleteNodes.push(node);
        return inst;
      },
      pushIncomplete: (inode: IncompleteNode) => {
        mIncompleteNodes.push(inode);
        return inst;
      }
    });
    ptbRes?.pushTo(inst);
    fn(mParts, mCompleteNodes, mIncompleteNodes);
  };

  const viewOnlyParts =
    (ptbRes: BuildStateAddition | undefined, fn: (...parts: TreePartBuild[]) => void): void =>
    _viewParts(ptbRes, fn, () => {});

  const allowOnlyParts =
    (ptbRes: BuildStateAddition | undefined, fn: (...parts: TreePartBuild[]) => void): void =>
    _viewParts(ptbRes, fn, fail);

  function includeAddsOnePartExample(ptbRes: () => BuildStateAddition | undefined) {
    it('add exactly one parts', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      allowOnlyParts(ptbRes(), (...args: TreePartBuild[]) => {
        expect(args.length).toEqual(1);
        hitsAtExactly(1);
      });
      expect(verifyHit()).toBeTruthy();
    });
  }

  describe('handles general case "( \\n ..."', () => {
    const args = [makeToken('('), makeToken('\n'), makeToken('a'), makeToken(')')];
    const ptbRes = () => makePtbRes(...args);
    
    includeHasAResultExample(ptbRes);
    includeAddsOnePartExample(ptbRes);

    it('left part range contains a range', () => {
      allowOnlyParts(ptbRes(), (left: TreePartBuild) => {
        expect(left.range()).toEqual({ start: 1, end: 3 });
      });
    });
  });

  describe('handles grouping case "( a )"', () => {
    const args = [makeToken('('), makeToken('a'), makeToken(')')];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);
    includeAddsOnePartExample(ptbRes);

    it('left part range contains "\\n" and "a" range', () => {
      allowOnlyParts(ptbRes(), (left: TreePartBuild) => {
        expect(left.range()).toEqual({ start: 1, end: 2 });
      });
    });
  });

  describe('handles grouping case "( a , b )"', () => {
    const args = [
      makeToken('('), makeToken('a'), makeToken(','), makeToken('b'),
      makeToken(')')
    ];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);
    includeAddsOnePartExample(ptbRes);

    it('left part range contains a range', () => {
      allowOnlyParts(ptbRes(), (left: TreePartBuild) => {
        expect(left.range()).toEqual({ start: 1, end: 4 });
      });
    });
  });

  describe('handles general operator case "a, b"', () => {
    const args = [makeToken('a'), makeToken(','), makeToken('b')];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    it('adds build part', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      allowOnlyParts(ptbRes(), (part: TreePartBuild) => {
        hitsAtExactly(1);
        expect(part).toBeDefined();
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('build part with remaining token', () => {
      allowOnlyParts(ptbRes(), (part: TreePartBuild) => {
        expect(part.range()).toEqual({ start: 2, end: 3 });
      });
    });
  });

  describe('handles function call case "f(...)..."', () => {
    describe('a simple one parameter function call "f(\'a\')"', () => {
      const args =
        [
          makeToken('f'), makeToken('('), makeToken("'a'"), makeToken(')')
        ];
      const ptbRes = () => makePtbRes(...args);
      const next2ndPtbRes = () => {
        let res: BuildStateAddition | undefined = undefined;
        allowOnlyParts(ptbRes(), (part: TreePartBuild) => {
          res = part.build();
        });
        return res;
      };


      includeHasAResultExample(ptbRes);

      it('pushes a new part', () => {
        allowOnlyParts(ptbRes(), (...parts: TreePartBuild[]) => {
          expect(parts.length).toEqual(1);
        });
      });

      describe('1st subsequent part', () => {
        it('adds an incomplete node', () => {
          viewAll(next2ndPtbRes(), (_0: TreePartBuild[], _1: AstNode[], inodes: IncompleteNode[]) => {
            expect(inodes.length).toEqual(1);
          });
        });

        it('pushes a new part', () => {
          viewOnlyParts(next2ndPtbRes(), (...parts: TreePartBuild[]) => {
            expect(parts.length).toEqual(1);
          });
        });
      });

      describe('2nd subsequent part', () => {
        it('adds exactly one build part', () => {
          const { verifyHit, hitsAtExactly } = ReachPoint.make();
          viewAll(next2ndPtbRes(), (parts: TreePartBuild[]) => {
            allowOnlyParts(parts[0]?.build(), (...parts: TreePartBuild[]) => {
              hitsAtExactly(1);
              expect(parts.length).toEqual(1);
            });
          });
          expect(verifyHit()).toBeTruthy();
        });

        it('left build part with parameter token', () => {
          viewAll(next2ndPtbRes(), (parts: TreePartBuild[]) => {
            allowOnlyParts(
              parts[0]?.build(),
              (leftPart: TreePartBuild) => {
                expect(leftPart.range()).toEqual({ start: 2, end: 3 });
              });
          });
        });
      });
    });
  });

  describe('let declaration', () => {
    const args =
      [
        makeToken('let'), makeToken('a'), makeToken(':='), makeToken("'hello'")
      ];
    const ptbRes = () => makePtbRes(...args);

    includeHasAResultExample(ptbRes);

    it('starts with exactly one part', () => {
      const { verifyHit, hitsAtExactly } = ReachPoint.make();
      allowOnlyParts(ptbRes(), (...parts: TreePartBuild[]) => {
        hitsAtExactly(1);
        expect(parts.length).toEqual(1);
      });
      expect(verifyHit()).toBeTruthy();
    });

    it('starts with part containing remainder of tokens', () => {
      allowOnlyParts(ptbRes(), (part: TreePartBuild) => {
        expect(part.range()).toEqual({ start: 2, end: 4 });
      });
    });

    describe('progressing to ":="', () => {
      it('is reachable', () => {
        const { verifyHit, hitsAtExactly } = ReachPoint.make();
        allowOnlyParts(ptbRes(), (part: TreePartBuild) => {
          viewOnlyParts(part.build(), (part: TreePartBuild) => {
            hitsAtExactly(1);
            expect(part).toBeDefined();
          });
        });
        expect(verifyHit()).toBeTruthy();
      });

      it('builds part for remaining literal', () => {
        allowOnlyParts(ptbRes(), (part: TreePartBuild) => {

          viewOnlyParts(part.build(), (part: TreePartBuild) => {
            expect(part.range()).toEqual({ start: 3, end: 4 });
          });
        });
      });
    });
  });

  describe('simple cases', () => {
    function includeBuildsSingleTupleExamples
      (ptbRes: () => BuildStateAddition | undefined)
    {
      it('builds no additional parts', () => {  
        viewAll(ptbRes(), (parts: TreePartBuild[]) => {
          expect(parts.length).toEqual(0);
        });
      });

      it('builds a single node', () => {  
        viewAll(ptbRes(), (_0: TreePartBuild[], nodes: AstNode[]) => {
          expect(nodes.length).toEqual(1);
        });
      });

      it('builds a tuple node', () => {  
        viewAll(ptbRes(), (_0: TreePartBuild[], nodes: AstNode[]) => {
          expect(nodes[0].type()).toEqual(AstNode.types.tuple);
        });
      });
    }

    function includeImmediatelyBuildsStringableToAExamples
      (ptbRes: () => BuildStateAddition | undefined)
    {
      it('immediately builds one node', () => {  
        viewAll(ptbRes(), (_0: TreePartBuild[], nodes: AstNode[]) => {
          expect(nodes.length).toEqual(1);
        });
      });

      it('that node is a string node', () => {  
        viewAll(ptbRes(), (_0: TreePartBuild[], nodes: AstNode[]) => {
          const fnode = AstFringeNode.downcast(nodes[0]);
          expect(fnode.asString()).toEqual('a');
        });
      });
    }

    describe('single string literal', () => {
      const ptbRes = () => make([makeToken("'a'")]).build();

      includeImmediatelyBuildsStringableToAExamples(ptbRes);
    });

    describe('new lines followed by nothing statements', () => {
      const ptbRes = () => make([makeToken('\n')]).build();

      includeBuildsSingleTupleExamples(ptbRes);
    });

    describe('empty statements', () => {
      const ptbRes = () => make([]).build();

      includeBuildsSingleTupleExamples(ptbRes);
    });

    describe('lone token followed by new line', () => {
      const args = [
        makeToken('a'),
        makeToken('\n')
      ];
      const ptbRes = () => make(args).build();

      it('does not add additional build parts', () => {
        viewAll(ptbRes(), (parts: TreePartBuild[]) => {
          expect(parts.length).toEqual(0);
        });
      });

      includeImmediatelyBuildsStringableToAExamples(ptbRes);
    });
  });

  describe('operator continuing across a new line', () => {
    const args = [
      makeToken('a'),
      makeToken(','),
      makeToken('\n'),
      makeToken('b')
    ];
    const ptbRes = () => make(args).build();

    it('adds exactly one part', () => {
      allowOnlyParts(ptbRes(), (...parts: TreePartBuild[]) => {
        expect(parts.length).toEqual(1);
      });
    });

    describe('subsequent build', () => {
      it('also builds on part', () => {
        allowOnlyParts(ptbRes(), (part: TreePartBuild | undefined) => {
          if (!part) {
            fail();
            return;
          }
          allowOnlyParts(part.build(), (...parts: TreePartBuild[]) => {
            expect(parts.length).toEqual(1);
          });
        });
      });

      describe('last subsequent build', () => {
        it('builds a single node', () => {
          allowOnlyParts(ptbRes(), (part: TreePartBuild | undefined) => {
            allowOnlyParts(part?.build(), (part: TreePartBuild | undefined) => {
              viewAll(part?.build(), (_0: TreePartBuild[], nodes: AstNode[]) => {
                expect(nodes.length).toEqual(1);
              });
            });
          });
        });

        it('that single node is a tuple', () => {
          allowOnlyParts(ptbRes(), (part: TreePartBuild | undefined) => {
            allowOnlyParts(part?.build(), (part: TreePartBuild | undefined) => {
              viewAll(part?.build(), (_0: TreePartBuild[], nodes: AstNode[]) => {
                expect(nodes[0]?.type()).toEqual(AstNode.types.tuple);
              });
            });
          });
        });
      });
    });
  });
});
