import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { Helpers } from './helpers';
import { type TypeResolution } from './type_resolution';
import { type TypeLookUpTable } from './ast_node';

export interface AstTupleNode extends AstNode {
  count: () => number,
  forEach: (fn: (node: AstNode) => void) => void,
  /// @returns undefined if "consumed"
  consume: (node: AstNode) => AstNode | undefined,
  seperatorEquals: (other: string) => boolean,
  append: (node: AstNode) => void
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

        visit: (visitor: AstNodeVisitor): void =>
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

        executionType: (_0: TypeLookUpTable): TypeResolution => {
          throw Error(`AstTupleNode does not implement executionType`);
        },

        asString: () => `(...${mSubExpressions.length} items)`
      });

      return inst;
    }
  });

  return class_;
})();
