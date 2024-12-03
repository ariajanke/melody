import { Helpers } from './helpers';
import { type ContextualLookUpTable } from './ast_node';
import { type AstNode } from './ast_node';
import { StandardError } from './helpers';
import { type ObjectTypeResolution } from './object_type_resolution';
import { type ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

export const NodesExecutionTypeResolution = freeze({
  make(mLookUpTable: ContextualLookUpTable, mSubExpressions: AstNode[]):
    ObjectTypeResolution
  {
    const { error, setErrorFn, hasErrorSet } = StandardError.make();
    return freeze({
      resolve: memoize(() => {
        const rv = mSubExpressions.map((node: AstNode) => {
          const { resolve, error } = node.executionType(mLookUpTable);
          const type = resolve();
          if (!type) {
            setErrorFn(error);
          }
          return type;
        });
        if (hasErrorSet()) {
          return undefined;
        } else if (rv.length === 1) {
          // Tuples of size one are treated as if they are just that value
          return rv[0];
        }
        return mLookUpTable.lookUpTuple(rv as ObjectType[]);
      }),
      error
    });
  }
});
export type NodesExecutionTypeResolution = ReturnType<typeof NodesExecutionTypeResolution.make>;
