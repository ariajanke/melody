import { StandardError, StandardErrorFn } from '../helpers';
import { TreePartTupleDivision } from './tree_part_tuple_division';
import { Helpers } from '../helpers';
import { NodeExpansion } from './node_expansion';
import {
  LeftTreePartHandler, LeftSideNodeExpansion
} from './left_side_node_expansion';
import { Token } from '../token';
import { TokenRange } from '../token_range';

interface PartialTreeStartGroupBuild {
  build: () => NodeExpansion | undefined,
  error: StandardErrorFn
}

// What's a group?? This is a tuple
export const PartialTreeStartGroupBuild = (() => {
  const { memoize, freeze } = Helpers;

  function make(leftPartHandler: LeftTreePartHandler,
                mTokenRange: TokenRange,
                mOperatorToken: Token):
                PartialTreeStartGroupBuild
  {
    const { error, setErrorFn } = StandardError.make();

    function build(): NodeExpansion | undefined {
      const nextPart = TreePartTupleDivision.
        make(mTokenRange.skipNewLine(), mOperatorToken)
      const leftPart = nextPart.leftPart() ?? setErrorFn(nextPart.error);
      if (!leftPart) {
        return;
      }
      const rightPart = nextPart.rightPart();
      return LeftSideNodeExpansion.
        make(leftPartHandler, leftPart, rightPart);
    }

    return freeze({
      build: memoize(build),
      error
    });
  }

  return freeze({ make });
})();
