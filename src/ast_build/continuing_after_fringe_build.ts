import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { IncompleteNode } from '../ast_incomplete_binary_node';
import { IncompleteBinaryNodeCreation } from './incomplete_binary_node_creation';
import { AstFringeNode } from '../ast_fringe_node';
import { ContinuingAfterOperatorBuild } from './continuing_after_operator_build';
import { StartGroupBuild } from './start_group_build';

const { freeze } = Helpers;
const kTokenTypes = Token.types;

export const ContinuingAfterFringeBuild = freeze({
  make: (mTokenRange: TokenRange,
         mFringeNode: AstFringeNode,
         mIncompleteNode: IncompleteNode): TreePartBuild =>
  {
    const { error, setErrorMessage, setErrorFn } = StandardError.make();
    const { startToken } = mTokenRange;

    const handleFringeNext = () =>
      setErrorMessage(`Post operator two consecutive fringe nodes not allowed`);

    const kNextTokenStrategies:
      { [type: symbol]: () => BuildStateAddition | undefined } =
    freeze({
      [kTokenTypes.identifier    ]: handleFringeNext,
      [kTokenTypes.stringLiteral ]: handleFringeNext,
      [kTokenTypes.integerLiteral]: handleFringeNext,
      [kTokenTypes.grouping      ]: () => {
        if (mTokenRange.isEmpty()) {
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushComplete(mIncompleteNode.finish(mFringeNode));
          });
        }
        return StartGroupBuild.makeBuildAdditionWithIncomplete(
          mTokenRange, startToken(), mIncompleteNode);
      },
      [kTokenTypes.operator      ]: () => {
        // TODO do operator precedence check here?
        
        const creation = IncompleteBinaryNodeCreation.make(startToken(), mFringeNode);
        const nextIncomplete = creation.makeNode();
        if (!nextIncomplete) {
          return setErrorFn(creation.error);
        }
        const nextPart = ContinuingAfterOperatorBuild.
          make(mTokenRange.step(), nextIncomplete);
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.
            pushIncomplete(mIncompleteNode).
            pushPart(nextPart);
        });
      },
      [kTokenTypes.newLine       ]: () => {
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushComplete(mIncompleteNode.finish(mFringeNode));
          if (!mTokenRange.skipNewLine().isEmpty()) {
            sink.pushPart(TreePartBuild.make(mTokenRange));
          }
        });
      }
    });

    const inst = freeze({ 
      build: (): BuildStateAddition | undefined => {
        const byType = startToken()?.type() ?? kTokenTypes.newLine;
        return kNextTokenStrategies[byType]();
      },
      error,
      range: mTokenRange.range
    });
    return inst;
  }
});
