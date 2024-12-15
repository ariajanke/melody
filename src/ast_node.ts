import { Helpers } from './helpers';
import { type AstNodeVisitor } from './ast_node_visitor';
import { type ObjectLookUpTable } from './object_look_up_table';
import { type ObjectTypeResolution } from './object_type_resolution';

const { freeze, memoize } = Helpers;

export interface AstNode {
  visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>) =>
    AccumulationType,
  type: () => symbol,
  executionType: (tbl  : ObjectLookUpTable) => ObjectTypeResolution,
  asString: () => string
}

export const AstNode = (() => {
  const class_ = freeze({
    makeTypeClassMethods() {
      const methods_ = freeze({
        type: memoize(Symbol),
        hasCreated: (node: AstNode) => node.type() === methods_.type()
      });
      return methods_;
    }
  });  
  
  return class_;
})();
