import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, type TreePartBuild } from './tree_part_build';
import { IncompleteNode } from '../ast_incomplete_binary_node';
import { AstFringeNode } from '../ast_fringe_node';
import { ContinuingAfterFringeBuild } from './continuing_after_fringe_build';
import { StartGroupBuild } from './start_group_build';

export const ContinuingAfterOperatorBuild = (() => {
  const { freeze } = Helpers;
  const kTokenTypes = Token.types;
  return freeze({
    make: (mTokenRange: TokenRange, mIncompleteNode: IncompleteNode):
      TreePartBuild =>
    {
      const { error, setErrorMessage } = StandardError.make();
      const { startToken } = mTokenRange;

      const handlePeekAheadFringe = () => {
        const fringeNode = AstFringeNode.makeForToken(startToken());
        const nextPart = ContinuingAfterFringeBuild.
          make(mTokenRange.step(), fringeNode, mIncompleteNode);
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushPart(nextPart);
        });
      };

      const kPeakAheadStrategies:
        { [type: symbol]: () => BuildStateAddition | undefined } =
      freeze({
        [kTokenTypes.identifier    ]: handlePeekAheadFringe,
        [kTokenTypes.integerLiteral]: handlePeekAheadFringe,
        [kTokenTypes.stringLiteral ]: handlePeekAheadFringe,
        [kTokenTypes.newLine       ]: () => {
          mTokenRange.skipNewLine();
          return kPeakAheadStrategies[startToken().type()]();
        },
        [kTokenTypes.grouping      ]: () => {
          const start_ = startToken();
          mTokenRange.step();
          if (mTokenRange.isEmpty()) {
            return setErrorMessage('unexpected end after operator');
          }
          return StartGroupBuild.makeBuildAdditionWithIncomplete(
            mTokenRange, start_, mIncompleteNode);
        },
        [kTokenTypes.operator      ]: () =>
          setErrorMessage(`Post operator two consecutive fringe nodes not allowed (unary nesting unimplemented)`)
      });

      return freeze({
        error,
        build: () => {
          if (mTokenRange.isEmpty()) {
            return setErrorMessage('unexpected end of input');
          }
          return kPeakAheadStrategies[startToken().type()]();
        },
        range: mTokenRange.range
      });
    }
  });
})();
