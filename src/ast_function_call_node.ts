import { AstNode, AstNodeVisitor } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstStringableNode } from './ast_stringable_node';

export interface AstFunctionCallNode extends AstNode {
  name: string,
  arguments: AstTupleNode
}

export const AstFunctionCallNode = (() => {
  const nodeTypes = AstNode.types;
  function make(lhs: AstNode, rhs: AstNode) {
    const arguments_: AstTupleNode = (() => {
      if (rhs.type() === nodeTypes.tuple) {
        return rhs as AstTupleNode;
      }
      return AstTupleNode.makeUnary(rhs);
    })();

    const name: string = (() => {
      // switch on type... nice
      switch (lhs.type()) {
      case nodeTypes.identifier:
      case nodeTypes.stringLiteral:
        return (lhs as AstStringableNode).asString();
      default: throw Error('unhandled');
      }
    })();

    const inst: AstFunctionCallNode = Object.freeze({
      name,
      arguments: arguments_,
      visit,
      type: () => nodeTypes.functionCall
    });

    function visit(visitor: AstNodeVisitor): void {
      visitor.visitFunctionCall(inst);
    }

    return inst;
  }

  return Object.freeze({ make });
})();
