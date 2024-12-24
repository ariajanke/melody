import { Helpers, FinishingMemoization, StandardError } from '../helpers';
import { LetNamesCollection } from './let_names_collection';
import { type AstTupleNode } from './ast_tuple_node';

const { freeze, memoize } = Helpers;

export type LetNamesCollector = {
  reduceOn: (fn: () => LetNamesCollector) => void,
  finish: () => LetNamesCollection
};

export const LetNamesCollector = freeze({
  makeErroneous: (message: string) => {
    const inst = freeze({
      reduceOn(_0: () => LetNamesCollector) { return inst; },
      finish: memoize(() => ({
        elements: () => undefined,
        error: () => freeze({ message }),
      }))
    });
    return inst satisfies LetNamesCollector;
  },
  make(mNames: string[], mOperator: string, mDependeeNames: string[], mArgsNode: AstTupleNode) {
    const { beforeFinish, memoizedFinish } = FinishingMemoization.make();
    const inst = freeze({
      reduceOn: beforeFinish((_0: () => LetNamesCollector): LetNamesCollector => {
        return LetNamesCollector.makeErroneous('too many operators');
      }),
      finish: memoizedFinish(() => {
        return LetNamesCollection.make(mNames, mOperator, mDependeeNames, mArgsNode);
      })
    });
    return inst satisfies LetNamesCollector;
  },
  makeEmpty() {
    const inst = freeze({
      reduceOn(reduce: () => LetNamesCollector) {
        return reduce();
      },
      finish: memoize(() => freeze({
        elements: () => [],
        error: () => StandardError.make().error()
      }))
    });
    return inst satisfies LetNamesCollector;
  }
});
