import { Helpers, StandardError } from '../helpers';
import { TokenRange } from '../token_range';
import { Token } from '../token';
import { FnClosePositionRetrieval } from './fn_close_position_retrieval';
import { BuildSink, BuildStateAddition, TreePartBuild } from './tree_part_build';
import { GroupBuildSplit } from './start_group_build';

const { freeze, memoize } = Helpers;

export const StartFunctionDefinitionBuild = (() => {
  return freeze({
    make: (mTokenRange: TokenRange, mFnToken: Token): TreePartBuild => {
      const { closePosition } = FnClosePositionRetrieval.
        make(mTokenRange, mFnToken);
      const { error } = StandardError.make();

      return freeze({
        build: memoize((): BuildStateAddition | undefined =>
          GroupBuildSplit.make(closePosition(), mTokenRange).build()),
        error,
        range: mTokenRange.range
      })
    }
  })
})();
