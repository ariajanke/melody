import { PartialTreeBuild, LineContinuationScheme } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { Helpers, StandardError, StandardErrorFn } from './helpers';
import { AstStringableNode } from './ast_stringable_node';
import { Token } from './token';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { NodeExpansion } from './node_expansion';
import { IncompleteNodeLeftTreePartHandler } from './left_side_node_expansion';
import { RightSideNodeExpansion, BareRightTreePartHandler, BuildPartRightTreePartHandler } from './right_side_node_expansion';

const { freeze } = Helpers;

export const PartialTreeStartIdentifierBuild = (() => {
  const tokenTypes = Token.types;
  const makeStringableNodeFor = AstStringableNode.makeForToken;

  function make(mTokens: TokenCollection, mStartToken: Token,
                mStart: number, mEnd: number,
                mLineContScheme: symbol)
  {
    const { error, setErrorMessage, setErrorFn } = StandardError.make();

    function build(): NodeExpansion | undefined {
      const lhsNode = makeStringableNodeFor(mStartToken);
      if (mEnd === mStart) {
        return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
      }
      const nextPos = mLineContScheme === LineContinuationScheme.inGroup ?
        mTokens.skipNewLine(mStart) : (mStart);
      const next = mTokens.at(nextPos);
      if (next.type() === tokenTypes.operator) {
        if (!lhsNode.comesBeforeOperator(next)) {
          return setErrorMessage(`operator "${next.content()}" not allowed here`);
        }
        const incompleteNode = AstIncompleteBinaryNode.
          makeForOperator(next.content(), lhsNode);
        const leftTreePartHandler = IncompleteNodeLeftTreePartHandler.make(incompleteNode);
        const { startGroupBuild, error } = PartialTreeStartGroupBuild.
          make(mTokens, leftTreePartHandler, next, nextPos + 1, mEnd);
        return startGroupBuild() ?? setErrorFn(error);
      } else if (next.type() === tokenTypes.newLine) {
        // also begging for extraction
        if (mLineContScheme === LineContinuationScheme.normal) {
          return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
        }
        if (mLineContScheme !== LineContinuationScheme.operatorContinued) {
          throw Error('impossible branch??');
        }
        const { normal } = LineContinuationScheme;
        const rightPart = PartialTreeBuild.
          make(mTokens, nextPos + 1, mEnd, normal)
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
