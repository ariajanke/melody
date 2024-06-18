import { Helpers, StandardError, StandardErrorFn } from '../helpers';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { StartUnaryOperatorBuild } from './start_unary_operator_build';
import { StartFringeBuild } from './start_fringe_build';
import { StartGroupBuild } from './start_group_build';
import { type AstNode } from '../ast_node';
import { type IncompleteNode } from '../ast_incomplete_binary_node';
import { AstTupleNode } from '../ast_tuple_node';

const { freeze } = Helpers;

export interface BuildSink {
  pushPart: (buildPart: TreePartBuild) => BuildSink,
  pushComplete: (node: AstNode) => BuildSink,
  pushIncomplete: (node: IncompleteNode) => BuildSink
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
  range: () => ({ start: number, end: number })
}

export const TreePartBuild = (() => {
  const kTokenTypes = Token.types;

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
      { [type: symbol]: () => BuildStateAddition | undefined } =
    freeze({
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
        const { build, error } = StartUnaryOperatorBuild.
          make(mTokenRange.step(), start);
        return build() ?? setErrorFn(error);
      },
      [kTokenTypes.newLine       ]: () => {
        mTokenRange.skipNewLine();
        return inst.build();
      }
    });

    const inst = freeze({
      build: (): BuildStateAddition | undefined => {
        if (mTokenRange.isEmpty()) {
          return BuildStateAddition.make((sink: BuildSink) => {
            sink.pushComplete(AstTupleNode.makeEmpty());
          });
        }

        return kStartingTokenTypeToBuildAddition[startToken().type()]();
      },
      range: mTokenRange.range,
      error
    });

    return inst;
  }

  return freeze({ make });
})();
