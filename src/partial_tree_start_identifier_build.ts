import { PartialTreeBuild } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { Helpers, StandardErrorsFn } from './helpers';
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

  function make(mTokens: TokenCollection, mStart: number, mEnd: number,
                mLineContScheme: symbol)
  {
    if (mStart === mEnd) {
      throw Error('');
    }

    const { lineContinuationScheme } = PartialTreeBuild;

    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    function build(): NodeExpansion | undefined {
      const lhsNode = makeStringableNodeFor(mTokens.at(mStart));
      if (mEnd - mStart === 1) {
        return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
      }
      const nextPos = mLineContScheme === lineContinuationScheme.inGroup ?
        mTokens.skipNewLine(mStart + 1) : (mStart + 1);
      const next = mTokens.at(nextPos);
      if (next.type() === tokenTypes.operator) {
        if (!lhsNode.comesBeforeOperator(next)) {
          mErrorFn = () =>
            freeze({ message: `operator "${next.content()}" not allowed here` });
          return;
        }
        const incompleteNode = AstIncompleteBinaryNode.
          makeForOperator(next.content(), lhsNode);
        const group = PartialTreeStartGroupBuild.
          make(mTokens, IncompleteNodeLeftTreePartHandler.make(incompleteNode), nextPos, mEnd, next.content());
        const built = group.startGroupBuild();
        if (built) return built;
        mErrorFn = group.error;
        return;
      } else if (next.type() === tokenTypes.newLine) {
        // also begging for extraction
        if (mLineContScheme === lineContinuationScheme.normal) {
          return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
        }
        if (mLineContScheme !== lineContinuationScheme.operatorContinued) {
          throw Error('impossible branch??');
        }
        const { normal } = PartialTreeBuild.lineContinuationScheme;
        const rightPart = PartialTreeBuild.
          make(mTokens, nextPos + 1, mEnd, normal)
        const ph = BuildPartRightTreePartHandler.make(rightPart);
        return RightSideNodeExpansion.make(lhsNode, ph);
      } else {
        mErrorFn = () => freeze({
          message: `not sure how to handle token "${next.content()}"`
        });
        return;
      }
    }

    return freeze({ build, error: () => mErrorFn() });
  }

  return freeze({ make });
})();
