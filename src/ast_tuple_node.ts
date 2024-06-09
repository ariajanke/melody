import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { Helpers } from './helpers';
import { type TypeResolution } from './type_resolution';
import { type TypeLookUpTable } from './ast_node';

export interface AstTupleNode extends AstNode {
  count: () => number,
  forEach: (fn: (node: AstNode) => void) => void,
  /// @returns undefined if "consumed"
  consume: (node: AstNode) => AstNode | undefined
}

export const AstTupleNode = (() => {
  const { freeze } = Helpers;
  const tupleType = AstNode.types.tuple;
  
  function makeWithPair(lhs: AstNode, rhs: AstNode | undefined): AstTupleNode {
    // NOTE: work around by taking advantage of how things are referenced in
    //       JavaScript. The passed in array is the member variable
    const mSubExpressions = [lhs];
    const inst = class_.make(mSubExpressions);
    if (rhs && inst.consume(rhs)) {
      mSubExpressions.push(rhs);
    }
    return inst;
  }

  const class_ = freeze({
    makeBinary: (_0: string, lhs: AstNode, rhs: AstNode): AstTupleNode =>
      makeWithPair(lhs, rhs),

    makeUnary: (lhs: AstNode): AstTupleNode =>
      makeWithPair(lhs, undefined),

    make: (mSubExpressions: AstNode[]): AstTupleNode => {
      const inst = freeze({
        forEach: (fn: (node: AstNode) => void): void =>
          mSubExpressions.forEach((node: AstNode) => fn(node)),
        
        count: (): number => mSubExpressions.length,

        visit: (visitor: AstNodeVisitor): void =>
          visitor.visitTuple(inst),
        
        type: (): symbol => tupleType,
        
        consume: (node: AstNode): AstNode | undefined => {
          if (node.type() !== tupleType)
            { return node; }
          (node as AstTupleNode).forEach((subNode: AstNode) => {
            mSubExpressions.push(subNode);
          });
          return undefined;
        },

        executionType: (_0: TypeLookUpTable): TypeResolution => {
          throw Error(`AstTupleNode does not implement executionType`);
        }
      });

      return inst;
    }
  });

  return class_;
})();
