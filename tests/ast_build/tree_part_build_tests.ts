import { TestHelpers, ReachPoint } from '../test_helpers';
import { Token } from '../../src/token';
import { AstNode } from '../../src/ast_node';
import { TokenRange } from '../../src/token_range';
import { TreePartBuild, type BuildSink } from '../../src/ast_build/tree_part_build';

const { describeNamed } = TestHelpers;

// TPB handles how to break the code up and that's it
describeNamed({ TreePartBuild }, () => {
  const make = (tokens: string[]) =>
    TreePartBuild.make
      (TokenRange.makeStartingRange(tokens.map(Token.forTesting.makeFromStringOnly)));

  const makeBuildSink =
    ({
      pushPart,
      pushGrouping,
      popGrouping,
      pushToken,
      pushNode,
      pushNewLine
    }:
    {
      pushPart?: ((buildPart: TreePartBuild) => BuildSink) | undefined,
      pushGrouping?: () => BuildSink,
      popGrouping?: (fn: (node: AstNode) => AstNode | undefined) => BuildSink,
      pushToken?: (token: Token, operandRelation: string) => BuildSink,
      pushNode?: (node: AstNode) => BuildSink,
      pushNewLine?: () => BuildSink
    }): BuildSink => {
      pushPart ??= (_0: TreePartBuild) => inst;
      pushGrouping ??= () => inst;
      popGrouping ??= (_fn: (node: AstNode) => AstNode | undefined) => inst;
      pushToken ??= (_token: Token, _operandRelation: string) => inst;
      pushNode ??= (_node: AstNode) => inst;
      pushNewLine ??= () => inst;
      const inst = Object.freeze({
        pushPart,
        pushGrouping,
        popGrouping,
        pushToken,
        pushNode,
        pushNewLine
      });
      return inst;
    };

  describe('starting with fringe tokens', () => {
    describe('fringe alone pushes a single node', () => {
      const build = () => make(['a']).build();

      it('is not an error', () => {
        expect(build()).toBeDefined();
      });

      it('build sink adds new fringe node', () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const sink = makeBuildSink({
          pushNode: (node: AstNode): BuildSink => {
            hitsAtExactly(1);
            expect(node.asString()).toEqual('a');
            return sink;
          }
        });
        build()?.pushTo(sink);
        expect(verifyHit()).toBeTruthy();
      });    
    });

    describe('fringe to (tuple) grouping', () => {
      const build = () => make(['a', '(', ')']).build();

      it('is not an error', () => {
        expect(build()).toBeDefined();
      });

      it('build sink begins a function call', () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const sink = makeBuildSink({
          pushToken(token: Token, operandRelation: string) {
            expect(operandRelation).toEqual('binary');
            expect(token.content()).toEqual(Token.kCallToken.content());
            hitsAtExactly(1);
            return sink;
          },
        });
        const addition = build();
        addition?.pushTo(sink);
        expect(verifyHit()).toBeTruthy();
      });
    });
  });

  describe('starting with grouping tokens', () => {
    describe('crossing a new line', () => {
      const build = () => make(['(', '\n', ')']).build();

      it('is not an error', () => {
        expect(build()).toBeDefined();
      });

      it('pushes a new grouping', () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const sink = makeBuildSink({
          pushGrouping() {
            hitsAtExactly(1);
            return sink;
          },
        });
        build()?.pushTo(sink);
        expect(verifyHit()).toBeTruthy();
      });

      it('pushes a right and left part', () => {
        const { hitsAtExactly, verifyHit } = ReachPoint.make();
        const numbers: number[][] = [];
        const sink = makeBuildSink({
          pushPart(buildPart: TreePartBuild) {
            hitsAtExactly(2);
            const { start, end } = buildPart.range();
            numbers.push([start, end]);
            return sink;
          }
        });
        build()?.pushTo(sink);
        expect(numbers).toEqual([[3, 3], [1, 2]]);
        expect(verifyHit()).toBeTruthy();
      });
    });
  });

  describe('begins with an operator', () => {
    describe('crossing a new line', () => {
      const build = () => make(['not', '\n', 'a']).build();

      it('is not an error', () => {
        const addition = build();
        const sink = makeBuildSink({});
        addition?.pushTo(sink);
        expect(addition).toBeDefined();
      });

      // is this really correct?
    });
  });
});
