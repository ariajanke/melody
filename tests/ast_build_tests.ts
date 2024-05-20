import { AstBuild } from '../src/ast_build';
import { TestHelpers } from './test_helpers';
import { Token } from '../src/token';
import { TokenCollection } from '../src/tokenization';
import { AstNodeVisitor } from '../src/ast_node';
import { AstFunctionCallNode } from '../src/ast_function_call_node';

const { describeNamed } = TestHelpers;

describeNamed({ AstBuild }, () => {
  const makeToken = Token.forTesting.makeFromStringOnly;

  describe('builds a mutli-line ast', () => {
    let tokens: Token[] = [];
    const buildAst = () => AstBuild.buildFor(TokenCollection.make(tokens));

    it('builds two function calls', () => {
      tokens = [
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];

      let i = 0;
      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitFunctionCall: (_0: AstFunctionCallNode) => {
          ++i;
        },
      })
      buildAst().visit(visitor);
      expect(i).toEqual(2);
    });

    it('two lines, operator first, call second', () => {
      tokens = [
        makeToken('\n'),
        makeToken('a'), makeToken(','), makeToken('b'), makeToken('\n'),
        makeToken('puts'), makeToken('('), makeToken('a'), makeToken(')'),
        makeToken('\n'),
      ];

      let i = 0;
      const visitor = AstNodeVisitor.makeFakeVisitor({
        visitFunctionCall: (_0: AstFunctionCallNode) => {
          ++i;
        },
      })
      buildAst().visit(visitor);
      expect(i).toEqual(1);
    });
  });
});
