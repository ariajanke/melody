import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ContinuingAfterOperatorBuild } from './continuing_after_operator_build';
import { StartGroupBuild } from './start_group_build';
import { AstNode } from '../ast_node';

const { freeze } = Helpers;
const kTokenTypes = Token.types;

export const ContinuingAfterSingleValueBuild = freeze({
  make: (mTokenRange: TokenRange, mCompleteNode: AstNode): TreePartBuild => {
    const { error, setErrorMessage } = StandardError.make();
    const { startToken } = mTokenRange;

    const handleFringeNext = () =>
      setErrorMessage(`Post operator two consecutive fringe nodes not allowed`);

    const handleGrouping = () => {
      const start = startToken();
      const tpb = StartGroupBuild.make(mTokenRange.step(), start);
      return BuildStateAddition.make((sink: BuildSink) => {
        sink.
          pushNode(mCompleteNode).
          pushToken(Token.kCallToken, 'binary').
          pushPart(tpb);
      });
    };

    const handleOperator = () => {
      // TODO do operator precedence check here?
      const evStartToken = startToken();
      const nextRange = mTokenRange.step();
      const nextPart = ContinuingAfterOperatorBuild.
        make(nextRange, evStartToken, 'binary');
      return BuildStateAddition.make((sink: BuildSink) => {
        sink.pushNode(mCompleteNode).pushPart(nextPart);
      });
    };

    const kNextTokenStrategies:
      { [type: symbol]: () => BuildStateAddition | undefined } =
    freeze({
      [kTokenTypes.identifier    ]: handleFringeNext,
      [kTokenTypes.stringLiteral ]: handleFringeNext,
      [kTokenTypes.integerLiteral]: handleFringeNext,
      [kTokenTypes.grouping      ]: handleGrouping,
      [kTokenTypes.operator      ]: handleOperator,
      [kTokenTypes.newLine       ]: () => {
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushNode(mCompleteNode).pushNewLine();
          if (!mTokenRange.skipNewLine().isEmpty()) {
            sink.pushPart(TreePartBuild.make(mTokenRange));
          }
        });
      }
    });

    const inst = freeze({ 
      build: (): BuildStateAddition | undefined => {
        if (mTokenRange.isEmpty()) {
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushNode(mCompleteNode);
          });
        }
        const byType = startToken().type();
        return kNextTokenStrategies[byType]();
      },
      error,
      range: mTokenRange.range
    });
    return inst;
  }
});
