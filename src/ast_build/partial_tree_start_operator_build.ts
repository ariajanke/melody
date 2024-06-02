import { IncompleteNode } from '../ast_incomplete_binary_node';
import { Helpers, StandardError } from '../helpers';
import { NodeExpansion } from './node_expansion';
import { IncompleteNodeLeftTreePartHandler } from './left_side_node_expansion';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { Token } from '../token';
import { TokenRange } from '../token_range';
import { AstIncompleteUnaryNode } from '../ast_let_declaration_node';

export const PartialTreeStartOperatorBuild = (() => {
  const { freeze } = Helpers;

  // looks a little lazy to me
  function make
    (mIncompleteNode: IncompleteNode,
     mOperatorToken: Token,
     mTokenRange: TokenRange)
  {
    const { setErrorFn, error } = StandardError.make();

    function build(): NodeExpansion | undefined {
      // const incompleteNode = AstIncompleteUnaryNode.makeForOperator(mOperatorToken.content());
      const leftTreePartHandler = IncompleteNodeLeftTreePartHandler.make(mIncompleteNode);
      const { build, error } = PartialTreeStartGroupBuild.
        make(leftTreePartHandler, mTokenRange, mOperatorToken);
      return build() ?? setErrorFn(error);
    }

    return freeze({ build, error });
  }

  return freeze({ make });
})();
