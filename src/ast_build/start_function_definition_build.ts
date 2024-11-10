import { Helpers, StandardError } from '../helpers';
import { TokenRange } from '../token_range';
import { Token } from '../token';
import { FnClosePositionRetrieval } from './fn_close_position_retrieval';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { ContinuingAfterSingleValueBuild } from './continuing_after_single_value_build';
import { AstNode } from '../ast_node';

const { freeze, memoize } = Helpers;

const CloseFunctionDefinitionBuild = freeze({
  make: (mTokenRange: TokenRange) => {
    return freeze({
      build: () => {
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.popBlock((node: AstNode) => {
            sink.pushPart(ContinuingAfterSingleValueBuild.make(mTokenRange, node));
            return undefined;
          });
        })
      },
      error: StandardError.make().error,
      range: mTokenRange.range,
      asString: () => `CFnD ${mTokenRange.asString()}`
    }) satisfies TreePartBuild;
  }
});

export const StartFunctionDefinitionBuild = freeze({
  make: (mTokenRange: TokenRange, mFnToken: Token): TreePartBuild => {
    const { closePosition } = FnClosePositionRetrieval.
      make(mTokenRange, mFnToken);
    const { start, end, clone } = mTokenRange;

    const inBlockRange = () => clone(start(), closePosition());
    const afterBlockRange = () => clone(closePosition() + 1, end());
    
    return freeze({
      build: memoize((): BuildStateAddition | undefined => {
        const afterPart = CloseFunctionDefinitionBuild.make(afterBlockRange());
        const inBlockPart = TreePartBuild.make(inBlockRange());
        return BuildStateAddition.make((sink: BuildSink) => {
          sink.pushBlock().pushPart(afterPart).pushPart(inBlockPart);
        });
      }),
      error: StandardError.make().error,
      range: mTokenRange.range,
      asString: () => `SFnD ${mTokenRange.asString()}`
    })
  }
});
