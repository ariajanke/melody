import { Helpers, raise, StandardError } from '../helpers';
import { Token, TokenType } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ContinuingAfterOperatorBuild } from './continuing_after_operator_build';
import { StartGroupBuild } from './start_group_build';
import { IastNode } from '../iast_node';
import { GroupingNamingSchema } from '../grouping_naming_schema';

const { freeze } = Helpers;
const kTokenTypes = Token.types;

export const ContinuingAfterSingleValueBuild = freeze({
  make: (mTokenRange: TokenRange, mCompleteNode: IastNode): TreePartBuild => {
    const { error, setErrorMessage } = StandardError.make();
    const { startToken } = mTokenRange;

    const handleFringeNext = () =>
      setErrorMessage(`Post operator two consecutive fringe nodes not allowed`);

    const handleGrouping = () => {
      const start = startToken();
      if (start.content() === GroupingNamingSchema.kFunctionDefinition) {
        raise('unhandled');
      } else if (start.content() === GroupingNamingSchema.kBodyClose) {
        return handleFringeNext();
      }
      const callToken = Token.makeCallAfter(start);
      const tpb = StartGroupBuild.make(mTokenRange.step(), start);
      return BuildStateAddition.make((sink: BuildSink) => {
        sink.
          pushNode(mCompleteNode).
          pushToken(callToken, 'binary').
          pushPart(tpb);
      });
    };

    const handleOperator = () => {
      const evStartToken = startToken();
      const nextRange = mTokenRange.step();
      const nextPart = ContinuingAfterOperatorBuild.
        make(nextRange, evStartToken, 'binary');
      return BuildStateAddition.make((sink: BuildSink) => {
        sink.pushNode(mCompleteNode).pushPart(nextPart);
      });
    };

    const kNextTokenStrategies:
      { [type in TokenType]: () => BuildStateAddition | undefined } =
    freeze({
      [kTokenTypes.identifier    ]: handleFringeNext,
      [kTokenTypes.stringLiteral ]: handleFringeNext,
      [kTokenTypes.numericLiteral]: handleFringeNext,
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
    } as { [type in TokenType]: () => BuildStateAddition | undefined });

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
      range: mTokenRange.range,
      asString: () => `CASV ${mTokenRange.asString()}`
    });
    return inst;
  }
});
