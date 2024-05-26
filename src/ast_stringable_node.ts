import { AstNode, AstNodeVisitor } from './ast_node';
import { ContextVariable } from './context_variable';
import { Token } from './token';
import { ObjectLookUpTable } from './type_system';
import { Helpers } from './helpers';

const { freeze } = Helpers;

export interface AstStringableNode extends AstNode {
  asString: () => string,
  comesBeforeOperator: (operator: Token) => boolean
}

export const AstStringableNode = (() => {
  const tokenTypes = Token.types;
  const nodeTypes = AstNode.types;

  function _downcast(node: AstNode): AstStringableNode | undefined {
    switch (node.type()) {
    case nodeTypes.identifier:
    case nodeTypes.stringLiteral:
      return node as AstStringableNode;
    default: break;
    }
    return undefined;
  }

  function downcast(node: AstNode): AstStringableNode {
    return _downcast(node) ?? (() => {
      throw Error('AstNode is not a AstStringableNode');
    })();
  }

  function hasCreated(node: AstNode): boolean {
    return !!_downcast(node);
  }

  function makeForToken(token: Token): AstStringableNode {
    return (() => {
      switch (token.type()) {
      case tokenTypes.identifier:
        return AstIdentifierNode;
      case tokenTypes.stringLiteral:
        return AstStringLiteralNode;
      default:
        throw Error('cannot build stringable node from token');
      }
    })().make(token.content());
  }

  return freeze({ downcast, hasCreated, makeForToken });
})();

function makeStringableNodeClass(nodeType: symbol) {
  const stringExecutionType = ContextVariable.types.string;

  function make
    (value: string,
     comesBeforeOperator: (operator: Token) => boolean):
    AstStringableNode
  {
    function visit(_0: AstNodeVisitor): void {}
    function type(): symbol { return nodeType; }
    function asString(): string { return value; }
    function executionType(_0: ObjectLookUpTable): symbol
      { return stringExecutionType; }

    return freeze({ visit, type, asString, comesBeforeOperator, executionType });
  }

  return freeze({ make });
}

export const AstStringLiteralNode = (() => {
  const Super = makeStringableNodeClass(AstNode.types.stringLiteral);

  function make(value: string): AstStringableNode {
    value = (() => {
      if (value.length <= 2) {
        throw Error('not a valid string');
      }
      return value.substring(1, value.length - 1);
    })();

    function comesBeforeOperator(operator: Token): boolean {
      return operator.content() === ',';
    }

    function resolveType(): string {
      return 'String';
    }

    return freeze({ resolveType, ...Super.make(value, comesBeforeOperator) });
  }

  return freeze({ make });
})();

export const AstIdentifierNode = (() => {
  const Super = makeStringableNodeClass(AstNode.types.identifier);

  function make(value: string): AstStringableNode {
    function comesBeforeOperator(operator: Token): boolean {
      const str = operator.content();
      return str === ',' || str === '(' || str === ':=';
    }

    return Super.make(value, comesBeforeOperator);
  }

  return freeze({ make });
})();
