import { AstIdentifierNode } from './ast_identifier_node';
import { AstIntegerLiteralNode } from './ast_integer_literal_node';
import { AstNode } from './ast_node';
import { AstStringLiteralNode } from './ast_string_literal_node';
import { Helpers } from '../helpers';
import { Token } from '../token';
import { type StringPool } from '../string_pool';

const { freeze } = Helpers;

export interface AstFringeNode extends AstNode {}

export interface AstLiteralNode extends AstFringeNode {
  value: (stringPool: StringPool) => number
}

export const AstFringeNode = (() => {
  const tokenTypes = Token.types;

  function _downcast(node: AstNode): AstFringeNode | undefined {
    switch (node.type()) {
    case AstIdentifierNode.type():
    case AstStringLiteralNode.type():
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
        throw new Error('cannot build stringable node from token');
      }
    })().make(token.content());
  }

  return freeze({ downcast, hasCreated, makeForToken });
})();
