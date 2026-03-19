import { Helpers, StandardError, StandardErrorFn } from '../helpers';
import { Token, TokenType } from '../token';
import { TokenRange } from '../token_range';
import { ContinuingAfterOperatorBuild } from './continuing_after_operator_build';
import { StartFringeBuild } from './start_fringe_build';
import { StartGroupBuild } from './start_group_build';
import { IastNode } from '../iast_node';
import { StartFunctionDefinitionBuild } from './start_function_definition_build';

const { freeze } = Helpers;

export interface BuildSink {
  pushPart: (buildPart: TreePartBuild) => BuildSink,
  pushStatement: () => BuildSink,
  popStatement: (fn: (node: IastNode) => IastNode | undefined) => BuildSink,
  pushToken: (token: Token, operandRelation: string) => BuildSink,
  pushNode: (node: IastNode) => BuildSink,
  pushNewLine: () => BuildSink,
  pushBlock: () => BuildSink,
  popBlock: (fn: (node: IastNode) => IastNode | undefined) => BuildSink
}

export interface BuildStateAddition {
  pushTo: (sink: BuildSink) => void
}

export const BuildStateAddition = (() => {
  const sNonAdditionInst = freeze({ pushTo: (_0: BuildSink) => {} });

  return freeze({
    make: (pushTo: (sink: BuildSink) => void) =>
      freeze({ pushTo }),
    makeNonAddition: (): BuildStateAddition =>
      sNonAdditionInst
  });
})();

export interface TreePartBuild {
  build: () => BuildStateAddition | undefined,
  error: StandardErrorFn,
  range: () => ({ start: number, end: number }),
  asString: () => string
}

export const TreePartBuild = (() => {
  const kTokenTypes = Token.types;

  type BsaFunc = () => BuildStateAddition | undefined;
  const unimplemented: BsaFunc = () => { throw new Error('unimplemented'); };

  // sort of taken to mean "I want a node(s)"
  function make(mTokenRange: TokenRange): TreePartBuild {
    const { error, setErrorFn } = StandardError.make();
    const { startToken } = mTokenRange;

    function switchToFringe(): BuildStateAddition | undefined {
      const start = startToken();
      const { build, error } = StartFringeBuild.make(start, mTokenRange.step());
      return build() ?? setErrorFn(error);
    }

    const kStartingTokenTypeToBuildAddition:
      { [type in TokenType]: BsaFunc } =
    freeze({
      [kTokenTypes.functionDefinition]: unimplemented,
      [kTokenTypes.special           ]: unimplemented,

      [kTokenTypes.identifier    ]: switchToFringe,
      [kTokenTypes.stringLiteral ]: switchToFringe,
      [kTokenTypes.integerLiteral]: switchToFringe,
      [kTokenTypes.grouping      ]: () => {
        const start = startToken();
        const { build, error } = StartGroupBuild.
          make(mTokenRange.step(), start);
        return build() ?? setErrorFn(error);
      },
      [kTokenTypes.operator      ]: () => {
        const start = startToken();
        const part = ContinuingAfterOperatorBuild.
          make(mTokenRange.step(), start, 'unary');
        const { build, error } = part;
        return build() ?? setErrorFn(error);
      },
      [kTokenTypes.newLine       ]: () => {
        mTokenRange.skipNewLine();
        return BuildStateAddition.make((sink: BuildSink) =>
          { sink.pushNewLine().pushPart(inst); });
      },
      [kTokenTypes.functionDefinition]: () => {
        const start = startToken();
        const { build, error } =
          StartFunctionDefinitionBuild.make(mTokenRange.step(), start);
        return build() ?? setErrorFn(error);
      }
    } as { [type in TokenType]: BsaFunc });

    const inst = freeze({
      build: (): BuildStateAddition | undefined => {
        if (mTokenRange.isEmpty()) {
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushNode(IastNode.makeEmptyTuple());
          });
        }
        const type = startToken().type();
        return kStartingTokenTypeToBuildAddition[type]();
      },
      range: mTokenRange.range,
      asString: () => `TPB ${mTokenRange.asString()}`,
      error
    });

    return inst;
  }

  return freeze({ make });
})();
