import { AstNode } from './ast_node';
import { type AstFringeNode } from './ast_fringe_node';
import { Helpers } from './helpers';
import { ContextVariable } from './context_variable';
import { type Token } from './token';
import { type TypeLookUpTable } from './ast_node';
import { type TypeResolution } from './type_resolution';
import { type AstNodeVisitor } from './ast_node_visitor';

const { freeze, memoize } = Helpers;

export const AstStringLiteralNode = (() => {
  const kStringLiteral = AstNode.types.stringLiteral;

  function make(mValue: string): AstFringeNode {
    mValue = (() => {
      if (mValue.length <= 2) {
        throw Error('not a valid string');
      }
      return mValue.substring(1, mValue.length - 1);
    })();
    const mGetAsContextVar = memoize(() => ContextVariable.make(mValue));

    return freeze({
      comesBeforeOperator: (operator: Token): boolean =>
        operator.content() === ',',
      executionType: (types: TypeLookUpTable): TypeResolution =>
        types.lookUpStringLiteralType(),
      evaluate: (_0: (name: string) => ContextVariable): ContextVariable =>
        mGetAsContextVar(),
      type: () => kStringLiteral,
      asString: () => mValue,
      visit: (_0: AstNodeVisitor) => {}
    });
  }

  return freeze({ make });
})();
