import { TokenCollection } from './tokenization';
import { Helpers, StandardError, StandardErrorFn } from './helpers';
import { Token } from './token';
import { PartialTreeStartGroupBuild } from './partial_tree_start_group_build';
import { PartialTreeStartIdentifierBuild } from './partial_tree_start_identifier_build';
import { NodeExpansion, EmptyNodeExpansion } from './node_expansion';
import { BareLeftTreePartHandler } from './left_side_node_expansion';
import { PartialTreeStartOperatorBuild } from './partial_tree_start_operator_build';
import { AstIncompleteUnaryNode } from './ast_let_declaration_node';
import { TokenRange } from './token_range';

const { freeze, verifyInTesting } = Helpers;

export interface PartialTreeBuild {
  buildPart: () => NodeExpansion | undefined,
  error: StandardErrorFn,
  range: () => ({ start: number, end: number })
}

export const LineContinuationScheme = freeze({
  inGroup: Symbol(),
  operatorContinued: Symbol(),
  normal: Symbol()
});

export const PartialTreeBuild = (() => {
  const tokenTypes = Token.types;

  function make
    (mTokens: TokenCollection, mStart: number, mEnd: number,
     mLineContScheme: symbol): PartialTreeBuild
  {
    const { error, setErrorFn, setErrorMessage } = StandardError.make();
    const mTokenRange = TokenRange.make(mTokens, mStart, mEnd);

    function buildPart(): NodeExpansion | undefined {
      if (mTokenRange.start() === mTokenRange.end()) { //mStart === mEnd) {
        return EmptyNodeExpansion.make();
      }

      mTokenRange.skipNewLine();
      // const startPos = mTokens.skipNewLine(mStart);
      if (mTokenRange.start() === mTokenRange.end()) {
        return EmptyNodeExpansion.make();
      }

      const start = mTokenRange.tokenAt(mTokenRange.start()); // mTokens.at(startPos);
      // tokens are more contextually identified
      // "(" is a grouping token in one context
      // but an operator in another
      mTokenRange.step();
      if (start.type() === tokenTypes.identifier ||
          start.type() === tokenTypes.stringLiteral)
      {
        const { build, error } = PartialTreeStartIdentifierBuild.
          make(mTokens, start, mTokenRange.start(), mTokenRange.end(), mLineContScheme);
          // startPos + 1, mEnd, mLineContScheme);
        return build() ?? setErrorFn(error);
      } else if (start.content() === '(') {
        const { startGroupBuild, error } = PartialTreeStartGroupBuild.
          make(mTokens,
               BareLeftTreePartHandler.make(),
               start,
               mTokenRange.start(),
               mTokenRange.end());  //start, startPos + 1, mEnd);
        return startGroupBuild() ?? setErrorFn(error);
      } else if (start.type() == tokenTypes.operator) {
        const incomplete = AstIncompleteUnaryNode.makeForOperator(start.content());
        const { build, error } = PartialTreeStartOperatorBuild.
          make(incomplete, start, mTokens, mTokenRange.start(), mTokenRange.end()); //startPos + 1, mEnd);
        return build() ?? setErrorFn(error);
      }
      setErrorMessage('unimplemented case');
    }

    function range() {
      verifyInTesting();
      return freeze({ start: mStart, end: mEnd });
    }

    return freeze({ buildPart, error, range });
  }

  return freeze({ make });
})();
