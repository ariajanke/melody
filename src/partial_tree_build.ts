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
  const { zeroSizedRange } = TokenRange;

  function make
    (mTokenRange: TokenRange, mLineContScheme: symbol): PartialTreeBuild
  {
    const { error, setErrorFn, setErrorMessage } = StandardError.make();
    
    function buildPart(): NodeExpansion | undefined {
      if (zeroSizedRange(mTokenRange)) {
        return EmptyNodeExpansion.make();
      }

      mTokenRange.skipNewLine();
      if (zeroSizedRange(mTokenRange)) {
        return EmptyNodeExpansion.make();
      }

      const start = mTokenRange.tokenAt(mTokenRange.start());
      // tokens are more contextually identified
      // "(" is a grouping token in one context
      // but an operator in another
      mTokenRange.step();
      if (start.type() === tokenTypes.identifier ||
          start.type() === tokenTypes.stringLiteral)
      {
        const { build, error } = PartialTreeStartIdentifierBuild.
          make(start, mTokenRange, mLineContScheme);
        return build() ?? setErrorFn(error);
      } else if (start.content() === '(') {
        const { startGroupBuild, error } = PartialTreeStartGroupBuild.
          make(BareLeftTreePartHandler.make(),
               mTokenRange,
               start);
        return startGroupBuild() ?? setErrorFn(error);
      } else if (start.type() == tokenTypes.operator) {
        const incomplete = AstIncompleteUnaryNode.makeForOperator(start.content());
        const { build, error } = PartialTreeStartOperatorBuild.
          make(incomplete, start, mTokenRange);
        return build() ?? setErrorFn(error);
      }
      setErrorMessage('unimplemented case');
    }

    function range() {
      verifyInTesting();
      const { start, end } = mTokenRange;
      return freeze({ start: start(), end: end() });
    }

    return freeze({ buildPart, error, range });
  }

  return freeze({ make });
})();
