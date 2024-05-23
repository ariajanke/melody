import { IncompleteNode } from './ast_incomplete_binary_node';
import { Helpers, StandardError } from './helpers';
import { NodeExpansion } from './node_expansion';
import { IncompleteNodeLeftTreePartHandler } from './left_side_node_expansion';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { Token } from './token';
import { TokenRange } from './token_range';

export const PartialTreeStartOperatorBuild = (() => {
  const { freeze } = Helpers;
  
  function make
    (mIncompleteNode: IncompleteNode,
     mNextToken: Token,
     mTokenRange: TokenRange)
  {
    const { setErrorFn, error } = StandardError.make();

    function build(): NodeExpansion | undefined {
      const leftTreePartHandler = IncompleteNodeLeftTreePartHandler.make(mIncompleteNode);
      const { startGroupBuild, error } = PartialTreeStartGroupBuild.
        make(leftTreePartHandler, mTokenRange, mNextToken);
      return startGroupBuild() ?? setErrorFn(error);
    }

    return freeze({ build, error });
  } 

  return freeze({ make });
})();