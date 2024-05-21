import { PartialTreeBuild } from '../src/partial_tree_build';
import { TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenCollection } from '../src/tokenization';
import { AstNode } from '../src/ast_node';
import { AstStringableNode } from '../src/ast_stringable_node';
// import { StartGroupCombiner } from '../src/partial_tree_start_group_build';
import { AstBuild } from '../src/ast_build';
import { EmptyNodeExpansion } from '../src/node_expansion';

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

  const make = (tokens: Token[]) =>
    PartialTreeBuild.make(TokenCollection.make(tokens), 0, tokens.length);
  const makePtbRes = (...tokens: Token[]) =>
    PartialTreeBuild.
      make(TokenCollection.make(tokens), 0, tokens.length).
      buildPart();

  function includeHasAResultExample(ptbRes: () => PartialTreeBuildResult | undefined) {
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

    it('begins as group start combiner', () => {
       expect(StartGroupCombiner.hasCreated(ptbRes())).toBeTruthy();
    })

    it('unprocessed range contains the remainder of tokens', () => {
      // ptbRes()?.expandIntoNodes((partBuild: PartialTreeBuild) => {
      //   partBuild.
      // });
      ;
      ptbRes()?.expandIntoNodes(buildProgramSequence);
      expect(EmptyNodeExpansion.hasCreated(ptbRes())).toBeTruthy();
      // expect(ptbRes()?.remainingPart?.buildPart()).
      //   toEqual(PartialTreeBuild.kNothing);
    });
  });

  describe('handles grouping case "( a )"', () => {
    const args = [makeToken('('), makeToken('a'), makeToken(')')];
    const ptbRes = () =>
      makePtbRes(...args);

    it('remaining part builds nothing', () => {
      expect(ptbRes()?.remainingPart?.buildPart()).toEqual(PartialTreeBuild.kNothing);
    });

    it('incomplete part builds a complete node', () => {
      expect(ptbRes()?.unprocessedPart?.buildPart()?.completedNode).toBeDefined();
    });

    it('incomplete part builds an identifier node', () => {
      const node = ptbRes()?.unprocessedPart?.buildPart()?.completedNode;
      expect(node?.type()).toBeDefined(AstNode.types.identifier);
    });

    it('incomplete part builds an "a" stringable node', () => {
      const node = ptbRes()?.unprocessedPart?.buildPart()?.completedNode;
      const str = node && AstStringableNode.downcast(node).asString();
      expect(str).toBeDefined('a');
    });
  });

  describe('handles grouping case "( a , b )"', () => {
    const ptbRes = () => makePtbRes(
      makeToken('('), makeToken('a'), makeToken(','), makeToken('b'),
      makeToken(')'));

    includeNoNodePtbExamples(ptbRes);

    it('unprocessed range contains the remainder of tokens', () => {
      expect(ptbRes()?.remainingPart?.buildPart()).
        toEqual(PartialTreeBuild.kNothing);
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
      const ptb = make([makeToken("'a'")]);
      const res = ptb.buildPart();
      const comp = res?.completedNode;
      const stringable = comp && AstStringableNode.downcast(comp);
      expect(stringable?.asString()).toEqual('a');
    });

    it('handles new lines followed by nothing statements', () => {
      const res = make([makeToken('\n')]).buildPart();
      expect(res).toEqual(PartialTreeBuild.kNothing);
    });

    it('handles empty statements', () => {
      const res = make([]).buildPart();
      expect(res).toEqual(PartialTreeBuild.kNothing);
    });

    it('handles a lone token statement', () => {
      const args = [
        makeToken('a'),
        makeToken('\n')
      ];
      const res = make(args).buildPart();

      expect(res).toBeDefined();
      expect(res?.completedNode?.type()).toEqual(AstNode.types.identifier);
      expect(res?.incompleteNode).toBeUndefined();
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
