import { Helpers, StandardError, StandardErrorFn } from '../helpers';
import { Token } from '../token';
import { AstIncompleteUnaryNode } from '../ast_let_declaration_node';
import { TokenRange } from '../token_range';
// dependancies down one, should not be seen by the outside world
import {
  PartialTreeStartGroupBuild
} from './partial_tree_start_group_build';
import {
  PartialTreeStartFringeBuild
} from './partial_tree_start_fringe_build';
import {
  NodeExpansion,
  EmptyNodeExpansion
} from './node_expansion';
import {
  BareLeftTreePartHandler
} from './left_side_node_expansion';
import {
  PartialTreeStartOperatorBuild
} from './partial_tree_start_operator_build';

const { freeze, verifyInTesting } = Helpers;

export interface TreePartBuild {
  buildPart: () => NodeExpansion | undefined,
  error: StandardErrorFn,
  range: () => ({ start: number, end: number })
}

export const LineContinuationScheme = freeze({
  inGroup: Symbol(),
  operatorContinued: Symbol(),
  normal: Symbol()
});

export const TreePartBuild = (() => {
  const tokenTypes = Token.types;
  const { zeroSizedRange } = TokenRange;

  function make
    (mTokenRange: TokenRange, mLineContScheme: symbol): TreePartBuild
  {
    const { error, setErrorFn, setErrorMessage } = StandardError.make();
    if (zeroSizedRange(mTokenRange)) {
      console.log('empty range');
    } else {
      console.log(`from "${mTokenRange.tokenAt(mTokenRange.start())?.content()}" to \
  "${mTokenRange.tokenAt(mTokenRange.end() - 1)?.content()}"`);
    }

    function tokenProducingFringeNode(token: Token): boolean {
      return ({
        [tokenTypes.identifier]: true,
        [tokenTypes.integerLiteral]: true,
        [tokenTypes.stringLiteral]: true
      })[token.type()] ?? false;
    }

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
      if (tokenProducingFringeNode(start)) {
        const { build, error } = PartialTreeStartFringeBuild.
          make(start, mTokenRange, mLineContScheme);
        return build() ?? setErrorFn(error);
      } else if (start.content() === '(') {
        const { build, error } = PartialTreeStartGroupBuild.
          make(BareLeftTreePartHandler.make(),
               mTokenRange,
               start);
        return build() ?? setErrorFn(error);
      } else if (start.type() == tokenTypes.operator) {
        const incompleteNode = AstIncompleteUnaryNode.makeForOperator(start.content());
        const { build, error } = PartialTreeStartOperatorBuild.
          make(incompleteNode, start, mTokenRange);
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
