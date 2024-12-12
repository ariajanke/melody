import { AstTupleNode } from './ast_tuple_node';
import { Helpers, StandardError, type StandardErrorFn } from './helpers';

const { freeze, memoize } = Helpers;

export const LetNamesCollectionNew = freeze({
  makeErroneousDuplicate: () =>
    LetNamesCollectionNew.makeErroneous('too many operators'),
  makeErroneous: (message: string) => {
    const inst = freeze({
      elements: () => undefined,
      error: () => freeze({ message }),
    });
    return inst satisfies LetNamesCollectionNew;
  },
  make: (mNames: string[], operator: string, dependeeNames: string[], node: AstTupleNode) => {
    const inst = freeze({
      elements: memoize((): Readonly<LetNameElement[]> | undefined => {
        return mNames.
          map((name: string) => ({ name, operator, dependeeNames, node }));
      }),
      error: () => StandardError.make().error(),
    });
    return inst satisfies LetNamesCollectionNew;
  },
  makeEmpty: memoize(() => freeze({
    elements: () => [],
    error: () => StandardError.make().error(),
  }) satisfies LetNamesCollectionNew)
});

export type LetNameElement = {
  name: string,
  operator: string,
  dependeeNames: string[],
  // type: ObjectType,
  node: AstTupleNode
}

export type LetNamesCollectionNew = Readonly<{
  elements: () => Readonly<LetNameElement[]> | undefined,
  error: StandardErrorFn,
}>;
