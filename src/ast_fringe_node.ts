import { AstNode, AstNodeVisitor, TypeLookUpTable, AstEvaluatableNode } from './ast_node';
import { Token } from './token';
import { ObjectLookUpTable } from './object_look_up_table';
import { Helpers } from './helpers';
import { ContextVariable } from './context_variable';
import { ObjectType } from './object_type';
import { AstIntegerLiteralNode } from './ast_integer_literal_node';

const { freeze } = Helpers;

export interface AstFringeNode extends AstEvaluatableNode {
  asString: () => string,
  comesBeforeOperator: (operator: Token) => boolean
}

export const AstFringeNode = (() => {
  const tokenTypes = Token.types;
  const nodeTypes = AstNode.types;

  function _downcast(node: AstNode): AstFringeNode | undefined {
    switch (node.type()) {
    case nodeTypes.identifier:
    case nodeTypes.stringLiteral:
      return node  as unknown as AstFringeNode;
    default: break;
    }
    return undefined;
  }

  function downcast(node: AstNode): AstFringeNode {
    return _downcast(node) ?? (() => {
      throw Error('AstNode is not a AstStringableNode');
    })();
  }

  function hasCreated(node: AstNode): boolean {
    return !!_downcast(node);
  }

  function makeForToken(token: Token): AstFringeNode {
    return (() => {
      switch (token.type()) {
      case tokenTypes.identifier:
        return AstIdentifierNode;
      case tokenTypes.stringLiteral:
        return AstStringLiteralNode;
      case tokenTypes.integerLiteral:
        return AstIntegerLiteralNode;
      default:
        throw Error('cannot build stringable node from token');
      }
    })().make(token.content());
  }

  return freeze({ downcast, hasCreated, makeForToken });
})();

export const AstStringLiteralNode = (() => {
  const kStringLiteral = AstNode.types.stringLiteral;
  const { getBuiltinTypes } = ObjectLookUpTable;

  function make(mValue: string): AstFringeNode {
    mValue = (() => {
      if (mValue.length <= 2) {
        throw Error('not a valid string');
      }
      return mValue.substring(1, mValue.length - 1);
    })();
    const mAsContextVar = ContextVariable.make(mValue);

    return freeze({
      comesBeforeOperator: (operator: Token): boolean =>
        operator.content() === ',',
      executionType: (_0: TypeLookUpTable): ObjectType =>
        getBuiltinTypes().String,
      evaluate: (_0: (name: string) => ContextVariable): ContextVariable =>
        mAsContextVar,
      type: () => kStringLiteral,
      asString: () => mValue,
      visit: (_0: AstNodeVisitor) => {}
    });
  }

  return freeze({ make });
})();

export const AstIdentifierNode = (() => {
  const kIndentifier = AstNode.types.identifier;

  function make(value: string): AstFringeNode {
    return freeze({
      comesBeforeOperator: (operator: Token): boolean => {
        const str = operator.content();
        return str === ',' || str === '(' || str === ':=';
      },
      executionType: (types: TypeLookUpTable): ObjectType =>
        types.lookUpIdentifierType(value),
      evaluate: (getter: (name: string) => ContextVariable): ContextVariable =>
        getter(value),
      type: () => kIndentifier,
      asString: () => value,
      visit: (_0: AstNodeVisitor) => {}
    });
  }

  return freeze({ make });
})();
