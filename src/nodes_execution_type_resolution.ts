import { Helpers } from './helpers';
import { type AstNode } from './ast_node';
import { StandardError } from './helpers';
import { type ObjectTypeResolution } from './object_type_resolution';
import { type ObjectType } from './object_type';
import { ObjectLookUpTable } from './object_look_up_table';

const { freeze, memoize } = Helpers;

export const NodesExecutionTypeResolution = freeze({
  make(
    mTypesTable: ObjectLookUpTable,
    mSubExpressions: AstNode[]):
    ObjectTypeResolution
  {
    const { error, setErrorFn, hasErrorSet } = StandardError.make();
    return freeze({
      resolve: memoize(() => {
        const rv = mSubExpressions.map((node: AstNode) => {
          const { resolve, error } = node.executionType(mTypesTable);
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
        return mTypesTable.lookUpTuple(rv as ObjectType[]);
      }),
      error
    });
  }
});
export type NodesExecutionTypeResolution = ReturnType<typeof NodesExecutionTypeResolution.make>;
