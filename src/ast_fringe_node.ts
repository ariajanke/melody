import { AstNode, AstEvaluatableNode } from './ast_node';
import { Token } from './token';
import { Helpers } from './helpers';
import { AstIntegerLiteralNode } from './ast_integer_literal_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstStringLiteralNode } from './ast_string_literal_node';

const { freeze } = Helpers;

export interface AstFringeNode extends AstEvaluatableNode {
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
