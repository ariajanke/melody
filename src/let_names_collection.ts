import { AstTupleNode } from './ast_tuple_node';
import { Helpers, StandardError, type StandardErrorFn } from './helpers';
import { ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

export const LetNamesCollection = freeze({
  makeErroneousDuplicate: () =>
    LetNamesCollection.makeErroneous('too many operators'),
  makeErroneous: (message: string) => {
    const inst = freeze({
      elements: () => undefined,
      error: () => freeze({ message }),
    });
    return inst satisfies LetNamesCollection;
  },
  make: (mNames: string[], operator: string, type: ObjectType, node: AstTupleNode) => {
    const inst = freeze({
      elements: memoize((): Readonly<LetNameElement[]> | undefined => {
        return mNames.
          map((name: string) => ({ name, operator, type, node }));
      }),
      error: () => StandardError.make().error(),
    });
    return inst satisfies LetNamesCollection;
  },
  makeEmpty: () => freeze({
    elements: () => [],
    error: () => StandardError.make().error(),
  }) satisfies LetNamesCollection
});

export type LetNameElement = {
  name: string,
  operator: string,
  type: ObjectType,
  node: AstTupleNode
}

export type LetNamesCollection = Readonly<{
  elements: () => Readonly<LetNameElement[]> | undefined,
  error: StandardErrorFn,
}>;
