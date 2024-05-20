import { AstNode, AstNodeVisitor } from './ast_node';

export interface AstTupleNode extends AstNode {
  count: () => number,
  forEach: (fn: (node: AstNode) => void) => void,
  /// @returns undefined if "consumed"
  mergeWith: (node: AstNode) => AstNode | undefined
}

export const AstTupleNode = (() => {
  const { freeze } = Object;
  const tupleType = AstNode.types.tuple;

  function makeBinary(lhs: AstNode, rhs: AstNode): AstTupleNode {
    return makeWithPair(lhs, rhs);
  }

  function makeUnary(lhs: AstNode): AstTupleNode {
    return makeWithPair(lhs, undefined);
  }

  function makeWithPair(lhs: AstNode, rhs: AstNode | undefined): AstTupleNode {
    // NOTE: work around by taking advantage of how things are referenced in
    //       JavaScript. The passed in array is the member variable
    const mSubExpressions = [lhs];
    const inst = make(mSubExpressions);
    if (rhs && inst.mergeWith(rhs)) {
      mSubExpressions.push(rhs);
    }
    return inst;
  }

  function make(mSubExpressions: AstNode[]): AstTupleNode {
    const inst = freeze({ forEach, count, visit, type, mergeWith });

    function forEach(fn: (node: AstNode) => void): void {
      mSubExpressions.forEach((node: AstNode) => fn(node));
    }

    function count(): number {
      return mSubExpressions.length;
    }

    function visit(visitor: AstNodeVisitor): void {
      mSubExpressions.forEach((node: AstNode) => { node.visit(visitor); });
    }

    function type(): symbol { return tupleType; }

    /// if mergeWith return undefined, then the node is 'consumed', otherwise it
    /// is returned
    function mergeWith(node: AstNode): AstNode | undefined {
      if (node.type() !== tupleType)
        { return node; }
      (node as AstTupleNode).forEach((subNode: AstNode) => {
        mSubExpressions.push(subNode);
      });
      return undefined;
    }

    return inst;
  }

  return freeze({ makeBinary, makeUnary, make });
})();
