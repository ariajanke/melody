import { PartialTreeBuild, PartialTreeBuildResult } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { StandardErrorsFn } from './helpers';
import { AstIdentifierNode, AstStringLiteralNode } from './ast_stringable_node';
import { Token } from './token';
import { AstIncompleteBinaryNode } from './ast_incomplete_binary_node';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { AstNode, AstNodeType } from './ast_node';

export const PartialTreeStartIdentifierBuild = (() => {
  const { freeze } = Object;

  const { skipNewLine } = PartialTreeStartGroupBuild;
  function make(mTokens: TokenCollection, mStart: number, mEnd: number,
                mLineContScheme: symbol) {
    if (mStart === mEnd) {
      throw Error('');
    }
    const { lineContinuationScheme } = PartialTreeBuild;

    const mStartToken = mTokens.at(mStart);
    let mErrorFn: StandardErrorsFn = () => { return undefined; };

    function buildForLoneNode(node: AstNode): PartialTreeBuildResult {
      return freeze({
        completedNode: node,
        incompleteNode: undefined,
        unprocessedPart: undefined,
        remainingPart: undefined
      });
    }

    function makeNodeForSingleToken(token: Token): AstNode {
      const name = token.content();
      if (token.type() === Token.types.identifier) {
        return AstIdentifierNode.make(name);
      } else if (token.type() === Token.types.stringLiteral) {
        return AstStringLiteralNode.make(name);
      }
      throw Error(`unimplemented token type`);
    }

    function operatorAllowForNode(node: AstNode, operator: string): boolean {
      if (node.type() === AstNodeType.identifier) {
        return operator === '(' || operator === ',';
      } else if (node.type() === AstNodeType.stringLiteral) {
        return operator === ',';
      }
      throw Error(`unimplemented node type`);
    }

    function build(): PartialTreeBuildResult | undefined {
      const lhsNode = makeNodeForSingleToken(mStartToken);
      if (mEnd - mStart === 1) {
        return buildForLoneNode(lhsNode);
      }
      // ONLY skip new lines if in a group
      const nextPos = mLineContScheme === lineContinuationScheme.inGroup ?
        skipNewLine(mTokens, mStart + 1) : (mStart + 1);
      const next = mTokens.at(nextPos);
      if (next.type() === Token.types.operator) {
        // grouping, specifically a function call
        // new line ignoring range [mStart + 2, mEnd]
        if (!operatorAllowForNode(lhsNode, next.content())) {
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
      } else if (next.type() === Token.types.newLine) {
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
