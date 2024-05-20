import { PartialTreeBuild, PartialTreeBuildResult } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardErrorsFn } from './helpers';
import { AstStringableNode } from './ast_stringable_node';
import { Token } from './token';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';

export const PartialTreeStartIdentifierBuild = (() => {
  const { freeze } = Object;
  const { skipNewLine } = PartialTreeStartGroupBuild;
  const tokenTypes = Token.types;
  const makeStringableNodeFor = AstStringableNode.makeForToken;

  function make(mTokens: TokenCollection, mStart: number, mEnd: number,
                mLineContScheme: symbol) {
    if (mStart === mEnd) {
      throw Error('');
    }
    const { lineContinuationScheme } = PartialTreeBuild;

    const mStartToken = mTokens.at(mStart);
    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    function buildForLoneNode(node: AstStringableNode): PartialTreeBuildResult {
      return freeze({
        completedNode: node,
        incompleteNode: undefined,
        unprocessedPart: undefined,
        remainingPart: undefined
      });
    }

    function build(): PartialTreeBuildResult | undefined {
      const lhsNode = makeStringableNodeFor(mStartToken);
      if (mEnd - mStart === 1) {
        return buildForLoneNode(lhsNode);
      }
      const nextPos = mLineContScheme === lineContinuationScheme.inGroup ?
        skipNewLine(mTokens, mStart + 1) : (mStart + 1);
      const next = mTokens.at(nextPos);
      if (next.type() === tokenTypes.operator) {

        // extract me
        if (!lhsNode.comesBeforeOperator(next)) {
          mErrorFn = () =>
            freeze({ message: `operator "${next.content()}" not allowed here` });
          return;
        }
        const incompleteNode = AstIncompleteBinaryNode.
          makeForOperator(next.content(), lhsNode);
        const group = PartialTreeStartGroupBuild.
          make(mTokens, incompleteNode, nextPos, mEnd, next.content());
        const built = group.startGroupBuild();
        if (built) return built;
        mErrorFn = group.error;
        return;

      } else if (next.type() === tokenTypes.newLine) {

        // also begging for extraction
        if (mLineContScheme === lineContinuationScheme.normal) {
          return buildForLoneNode(lhsNode);
        }
        if (mLineContScheme !== lineContinuationScheme.operatorContinued) {
          throw Error('impossible branch??');
        }
        const { normal } = PartialTreeBuild.lineContinuationScheme;
        return freeze({
          completedNode: lhsNode,
          incompleteNode: undefined,
          unprocessedPart: undefined,
          remainingPart: PartialTreeBuild.
            make(mTokens, nextPos + 1, mEnd, normal)
        });
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
