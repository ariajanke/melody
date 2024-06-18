import { AstNode, type TypeLookUpTable } from './ast_node';
import { AstTupleNode } from './ast_tuple_node';
import { AstFringeNode } from './ast_fringe_node';
import { type AstNodeVisitor } from './ast_node_visitor';
import { type TypeResolution } from './type_resolution';

export interface AstFunctionCallNode extends AstNode {
  name: string,
  arguments: AstTupleNode
}

export const AstFunctionCallNode = (() => {
  const nodeTypes = AstNode.types;

  function make(_0: string, lhs: AstNode, rhs: AstNode) {
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
        return (lhs as AstFringeNode).asString();
      default: throw Error('unhandled');
      }
    })();

    const inst: AstFunctionCallNode = Object.freeze({
      name,
      arguments: arguments_,
      visit,
      type: () => nodeTypes.functionCall,
      executionType: (_0: TypeLookUpTable): TypeResolution => {
        throw Error('executionType is not implemented for function call nodes');
      }
    });

    function visit(visitor: AstNodeVisitor): void {
      visitor.visitFunctionCall(inst);
    }

    return inst;
  }

  return Object.freeze({ make });
})();
