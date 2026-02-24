import { Helpers, StandardError } from '../helpers';
import { Token, TokenType } from '../token';
import { TokenRange } from '../token_range';
import { BuildSink, BuildStateAddition, type TreePartBuild } from './tree_part_build';
import { ContinuingAfterSingleValueBuild } from './continuing_after_single_value_build';
import { StartGroupBuild } from './start_group_build';
import { StartFunctionDefinitionBuild } from './start_function_definition_build';
import { IastNode } from '../iast_node';

export const ContinuingAfterOperatorBuild = (() => {
  const { freeze } = Helpers;
  const kTokenTypes = Token.types;
  return freeze({
    make: (mTokenRange: TokenRange, mPrevOperatorToken: Token, mOperandRelation: string):
      TreePartBuild =>
    {
      const { error, setErrorMessage } = StandardError.make();
      const { startToken } = mTokenRange;

      const handlePeekAheadFringe = () => {
        const start = startToken();
        const nextPart = ContinuingAfterSingleValueBuild.
          make(mTokenRange.step(), IastNode.makeFringe(start));
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(nextPart);
        });
      };

      const kPeakAheadStrategies:
        { [type in TokenType]: () => BuildStateAddition | undefined } =
      freeze({
        [kTokenTypes.special       ]: () => {
          throw new Error('unimplemented');
        },
        [kTokenTypes.identifier    ]: handlePeekAheadFringe,
        [kTokenTypes.integerLiteral]: handlePeekAheadFringe,
        [kTokenTypes.stringLiteral ]: handlePeekAheadFringe,
        [kTokenTypes.newLine       ]: () => {
          mTokenRange.skipNewLine();
          return BuildStateAddition.make((sink: BuildSink) =>
            sink.pushNewLine().pushPart(inst));
        },
        [kTokenTypes.grouping      ]: () => {
          const start_ = startToken();
          mTokenRange.step();
          if (mTokenRange.isEmpty()) {
            return setErrorMessage('unexpected end after operator starting grouping');
          }
          const tpb = StartGroupBuild.make(mTokenRange, start_);
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(tpb);
          });
        },
        [kTokenTypes.operator      ]: () => {
          const start = startToken();
          const tpb = ContinuingAfterOperatorBuild.
            make(mTokenRange.step(), start, 'unary');
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(tpb);
          });
        },
        [kTokenTypes.functionDefinition]: () => {
          const start = startToken();
          const nextPart = StartFunctionDefinitionBuild.make(mTokenRange.step(), start);
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushToken(mPrevOperatorToken, mOperandRelation).pushPart(nextPart);
          });
        }
      } as { [type in TokenType]: () => BuildStateAddition | undefined });

      const inst = freeze({
        error,
        build: () => {
          if (mTokenRange.isEmpty()) {
            return setErrorMessage('unexpected end of input');
          }
          const type = startToken().type();
          return kPeakAheadStrategies[type]();
        },
        range: mTokenRange.range,
        asString: () => `CAO ${mTokenRange.asString()}`
      });
      return inst;
    }
  });
})();
