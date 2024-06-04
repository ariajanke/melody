import { TreePartBuild, LineContinuationScheme } from './tree_part_build';
import { Helpers, StandardError } from '../helpers';
import { AstFringeNode } from '../ast_fringe_node';
import { Token } from '../token';
import {
  IncompleteNodeCreation
} from '../ast_incomplete_binary_node';
import { NodeExpansion } from './node_expansion';
import {
  RightSideNodeExpansion,
  BareRightTreePartHandler,
  BuildPartRightTreePartHandler
} from './right_side_node_expansion';
import { PartialTreeStartOperatorBuild } from './partial_tree_start_operator_build';
import { TokenRange } from '../token_range';

const { freeze } = Helpers;

export const PartialTreeStartFringeBuild = (() => {
  const tokenTypes = Token.types;
  const makeFringeNodeFor = AstFringeNode.makeForToken;
  const { zeroSizedRange } = TokenRange;

  function make(mStartToken: Token,
                mTokenRange: TokenRange,
                mLineContScheme: symbol)
  {
    const { error, setErrorMessage, setErrorFn } = StandardError.make();

    function build(): NodeExpansion | undefined {
      const lhsNode = makeFringeNodeFor(mStartToken);
      if (zeroSizedRange(mTokenRange)) {
        return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
      }
      if (mLineContScheme === LineContinuationScheme.inGroup) {
        mTokenRange.skipNewLine();
      }
      const next = mTokenRange.tokenAt(mTokenRange.start());
      mTokenRange.step();
      if (next.type() === tokenTypes.operator) {
        if (!lhsNode.comesBeforeOperator(next)) {
          return setErrorMessage(`operator "${next.content()}" not allowed here`);
        }
        const nodeCreation = IncompleteNodeCreation.make(next, lhsNode);
        const incompleteNode = nodeCreation.makeNode();
        if (!incompleteNode)
          { return setErrorFn(nodeCreation.error); }

        const { build, error } = PartialTreeStartOperatorBuild.
          make(incompleteNode, next, mTokenRange);
        return build() ?? setErrorFn(error);
      } else if (next.type() === tokenTypes.newLine) {
        // also begging for extraction
        const { normal } = LineContinuationScheme;
        const rightPart = TreePartBuild.make(mTokenRange, normal);
        const ph = BuildPartRightTreePartHandler.make(rightPart);
        return RightSideNodeExpansion.make(lhsNode, ph);
      } else {
        return setErrorMessage(`not sure how to handle token "${next.content()}"`);
      }
    }

    return freeze({ build, error });
  }

  return freeze({ make });
})();
