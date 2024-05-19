import { AstNode, AstNodeVisitor, AstNodeType } from './ast_node';

const { freeze } = Object;

export interface AstStringableNode extends AstNode {
  asString: () => string
}

export const AstStringableNode = (() => {
  function _downcast(node: AstNode): AstStringableNode | undefined {
    switch (node.type()) {
    case AstNodeType.identifier:
    case AstNodeType.stringLiteral:
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

  return freeze({ downcast, hasCreated });
})();

function makeStringableNodeClass(nodeType: symbol) {
  function make(value: string): AstStringableNode {
    function visit(_: AstNodeVisitor): void {}
    function type(): symbol { return nodeType; }
    function asString(): string { return value; }

    return freeze({ visit, type, asString });
  }

  return freeze({ make });
}

export const AstStringLiteralNode = (() => {
  const Super = makeStringableNodeClass(AstNodeType.stringLiteral);

  function make(value: string): AstStringableNode {
    value = (() => {
      if (value.length <= 2) {
        throw Error('not a valid string');
      }
      return value.substring(1, value.length - 1);
    })();

    return Super.make(value);
  }

  return freeze({ make });
})();

export const AstIdentifierNode =
  makeStringableNodeClass(AstNodeType.identifier);
