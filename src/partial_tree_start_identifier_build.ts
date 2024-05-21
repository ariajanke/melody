import { PartialTreeBuild, NodeExpansion, PartialBuildToNodesFn } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardErrorsFn, TypeCheckable } from './helpers';
import { AstStringableNode } from './ast_stringable_node';
import { Token } from './token';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { AstNode } from './ast_node';

export const SingleNodeCombiner = (() => {
  const { freeze } = Object;
  const { type, hasCreated } = TypeCheckable.make();

  function make(node: AstNode): NodeExpansion {
    function expandIntoNodes(_0: PartialBuildToNodesFn): Readonly<AstNode[]>
      { return [node]; }

    return freeze({ expandIntoNodes, type });
  }

  return freeze({ make, hasCreated });
})();

export const SingleNodeCombinerWithRemaining = (() => {
  const { freeze } = Object;
  const { type, hasCreated } = TypeCheckable.make();

  function make
    (node: AstNode, remainingPart: PartialTreeBuild):
    NodeExpansion
  {
    function expandIntoNodes(fn: PartialBuildToNodesFn): Readonly<AstNode[]> {
      return [
        node,
        ...fn(remainingPart),
      ];
    }

    return freeze({ expandIntoNodes, type });
  }

  return freeze({ make, hasCreated });
})();

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

    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    function build(): NodeExpansion | undefined {
      const lhsNode = makeStringableNodeFor(mTokens.at(mStart));
      if (mEnd - mStart === 1) {
        return SingleNodeCombiner.make(lhsNode);
      }
      const nextPos = mLineContScheme === lineContinuationScheme.inGroup ?
        skipNewLine(mTokens, mStart + 1) : (mStart + 1);
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
          make(mTokens, incompleteNode, nextPos, mEnd, next.content());
        const built = group.startGroupBuild();
        if (built) return built;
        mErrorFn = group.error;
        return;

      } else if (next.type() === tokenTypes.newLine) {
        // also begging for extraction
        if (mLineContScheme === lineContinuationScheme.normal) {
          return SingleNodeCombiner.make(lhsNode);
        }
        if (mLineContScheme !== lineContinuationScheme.operatorContinued) {
          throw Error('impossible branch??');
        }
        const { normal } = PartialTreeBuild.lineContinuationScheme;
        const remaining = PartialTreeBuild.
          make(mTokens, nextPos + 1, mEnd, normal)
        return SingleNodeCombinerWithRemaining.
          make(lhsNode, remaining);
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
