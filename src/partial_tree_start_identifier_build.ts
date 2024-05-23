import { PartialTreeBuild, LineContinuationScheme } from './partial_tree_build';
import { TokenCollection } from './tokenization';
import { Helpers, StandardError } from './helpers';
import { AstStringableNode } from './ast_stringable_node';
import { Token } from './token';
import {
  AstIncompleteBinaryNode,
  IncompleteNodeCreation
} from './ast_incomplete_binary_node';
import { NodeExpansion } from './node_expansion';
import {
  RightSideNodeExpansion,
  BareRightTreePartHandler,
  BuildPartRightTreePartHandler
} from './right_side_node_expansion';
import { PartialTreeStartOperatorBuild } from './partial_tree_start_operator_build';
import { TokenRange } from './token_range';

const { freeze } = Helpers;

export const PartialTreeStartIdentifierBuild = (() => {
  const tokenTypes = Token.types;
  const makeStringableNodeFor = AstStringableNode.makeForToken;

  function make(mTokens: TokenCollection, mStartToken: Token,
                mStart: number, mEnd: number,
                mLineContScheme: symbol)
  {
    const { error, setErrorMessage, setErrorFn } = StandardError.make();
    const mTokenRange = TokenRange.make(mTokens, mStart, mEnd);

    // function startOperator() {
    //   const { build, error } = PartialTreeStartOperatorBuild.
    //     make(incompleteNode, next, mTokens, nextPos + 1, mEnd);
    //   return build() ?? setErrorFn(error);
    // }

    function build(): NodeExpansion | undefined {
      const lhsNode = makeStringableNodeFor(mStartToken);
      if (mTokenRange.end() === mTokenRange.start()) { //mEnd === mStart) {
        return RightSideNodeExpansion.make(lhsNode, BareRightTreePartHandler.make());
      }
      // const nextPos = mLineContScheme === LineContinuationScheme.inGroup ?
      //   mTokens.skipNewLine(mStart) : (mStart);
      if (mLineContScheme === LineContinuationScheme.inGroup) {
        mTokenRange.skipNewLine();
      }
      const next = mTokenRange.tokenAt(mTokenRange.start()); //mTokens.at(nextPos);
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
          make(incompleteNode, next, mTokens, mTokenRange.start(), mTokenRange.end()); //nextPos + 1, mEnd);
        return build() ?? setErrorFn(error);
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
          make(mTokens, mTokenRange.start(), mTokenRange.end(), normal); //nextPos + 1, mEnd, normal);
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
