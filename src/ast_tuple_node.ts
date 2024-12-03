import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { Helpers } from './helpers';
import { type ContextualLookUpTable } from './ast_node';
import { type ObjectTypeResolution } from './object_type_resolution';
import { NodesExecutionTypeResolution } from './nodes_execution_type_resolution';

export interface AstTupleNode extends AstNode {
  count: () => number,
  forEach: (fn: (node: AstNode) => void) => void,
  /// @returns undefined if "consumed"
  consume: (node: AstNode) => AstNode | undefined,
  seperatorEquals: (other: string) => boolean,
  append: (node: AstNode) => void,
  map: <Type>(fn: (node: AstNode) => Type) => Type[]
}

export const AstTupleNode = (() => {
  const { freeze, memoize } = Helpers;
  const tupleType = AstNode.types.tuple;
  
  function makeWithPair(sep: string, lhs: AstNode, rhs: AstNode | undefined): AstTupleNode {
    // NOTE: work around by taking advantage of how things are referenced in
    //       JavaScript. The passed in array is the member variable
    const mSubExpressions = [lhs];
    const inst = class_.make(sep, mSubExpressions);
    if (rhs && inst.consume(rhs)) {
      mSubExpressions.push(rhs);
    }
    return inst;
  }

  const class_ = freeze({
    makeEmpty: (): AstTupleNode =>
      memoize(() => class_.make(',', []))(),

    makeBinary: (seperator: string, lhs: AstNode, rhs: AstNode): AstTupleNode =>
      makeWithPair(seperator, lhs, rhs),

    make: (mSeperator: string, mSubExpressions: AstNode[]): AstTupleNode => {
      if (mSubExpressions.length === 1 && mSubExpressions[0].type() === tupleType) {
        return mSubExpressions[0] as AstTupleNode;
      }
      const inst = freeze({
        forEach: (fn: (node: AstNode) => void): void =>
          mSubExpressions.forEach((node: AstNode) => fn(node)),
        
        count: (): number => mSubExpressions.length,

        visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
          visitor.visitTuple(inst),

        append: (node: AstNode) =>
          { mSubExpressions.push(node); },
        
        type: (): symbol => tupleType,
        
        consume: (node: AstNode): AstNode | undefined => {
          if (node.type() !== tupleType)
            { return node; }
          const asTuple = (node as AstTupleNode);
          if (!asTuple.seperatorEquals(mSeperator))
            { return node; }
          asTuple.forEach((subNode: AstNode) => {
            mSubExpressions.push(subNode);
          });
          return undefined;
        },

        seperatorEquals: (other: string) => mSeperator === other,

        executionType: (lookUp: ContextualLookUpTable): ObjectTypeResolution =>
          NodesExecutionTypeResolution.make(lookUp, mSubExpressions),

        asString: () => `(...${mSubExpressions.length} items)`,

        map: <Type>(fn: (node: AstNode) => Type): Type[] =>
          mSubExpressions.map(fn)
      });

      return inst;
    }
  });

  return class_;
})();
