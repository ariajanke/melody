import { AstFringeNode } from '../ast_fringe_node';
import { IncompleteNode } from '../ast_incomplete_binary_node';
import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { ContinuingAfterOperatorBuild } from './continuing_after_operator_build';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { IncompleteBinaryNodeCreation } from './incomplete_binary_node_creation';

const { freeze } = Helpers;

export const StartFringeBuild = (() => {
  const kTokenTypes = Token.types;
  const kCallToken = Token.forTesting.makeFromStringOnly('call');

  return freeze({
    make: (mFringeToken: Token,
           mTokenRange: TokenRange) =>
    {
      const { error, setErrorMessage, setErrorFn } = StandardError.make();
      const { startToken } = mTokenRange;

      function handleFringe() {
        return setErrorMessage(
          `Cannot follow "${mFringeToken.content()}" with "${startToken().content()}"`);
      }

      function fringeNode() {
        return AstFringeNode.makeForToken(mFringeToken);
      }

      function makeIncompleteNode(token: Token): IncompleteNode | undefined {
        const { makeNode, error } = IncompleteBinaryNodeCreation.
          make(token, fringeNode());
        return makeNode() ?? setErrorFn(error);
      }

      function buildFringeWithRangeAsNewPart() {
        const fnode = fringeNode();
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushComplete(fnode);
          if (!mTokenRange.isEmpty()) {
            sink.pushPart(TreePartBuild.make(mTokenRange));
          }
        });
      }

      function handleOperator(token: Token) {
        const incompleteNode = makeIncompleteNode(token);
        if (!incompleteNode) return;
        const afterOpBuild = ContinuingAfterOperatorBuild.
          make(mTokenRange, incompleteNode);
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushPart(afterOpBuild);
        });
      }

      const priv:
        { [type: symbol]: () => BuildStateAddition | undefined } =
      freeze({
        [kTokenTypes.identifier    ]: handleFringe,
        [kTokenTypes.stringLiteral ]: handleFringe,
        [kTokenTypes.integerLiteral]: handleFringe,
        [kTokenTypes.grouping      ]: () =>
          handleOperator(kCallToken),
        [kTokenTypes.operator      ]: () => {
          const start_ = startToken();
          mTokenRange.step();
          return handleOperator(start_);
        },
        [kTokenTypes.newLine       ]: () => {
          mTokenRange.step();
          return buildFringeWithRangeAsNewPart();
        }
      });

      return freeze({
        build: (): BuildStateAddition | undefined => {
          if (mTokenRange.isEmpty()) {
            return buildFringeWithRangeAsNewPart();
          }
          return priv[startToken().type()]();
        },
        error
      });
    }
  });
})();
