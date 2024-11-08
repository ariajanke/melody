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

  function make(_0: string, lhs: AstNode, rhsArgs: AstNode) {
    const arguments_: AstTupleNode = (() => {
      if (rhsArgs.type() === nodeTypes.tuple) {
        return rhsArgs as AstTupleNode;
      }
      return AstTupleNode.make(',', [rhsArgs]);
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
      asString: () => `${name}(...)`,
      arguments: arguments_,
      visit: (visitor: AstNodeVisitor): void => {
        lhs.visit(visitor);
        visitor.visitFunctionCall(inst);
      },
      type: () => nodeTypes.functionCall,
      executionType: (_0: TypeLookUpTable): TypeResolution => {
        throw Error('executionType is not implemented for function call nodes');
      }
    });

    return inst;
  }

  return Object.freeze({ make });
})();
