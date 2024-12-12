import { Helpers, FinishingMemoization, StandardError } from './helpers';
import { type ExecutionContext } from './execution_context';
import { LetNamesCollectionNew } from './let_names_collection_new';
import { type AstTupleNode } from './ast_tuple_node';

const { freeze, memoize } = Helpers;

export type LetNamesCollectorNew = {
  reduceOn: (fn: () => LetNamesCollectorNew) => void,
  finish: () => LetNamesCollectionNew
};

export const LetNamesCollectorNew = freeze({
  makeErroneous: (message: string) => {
    const inst = freeze({
      setType(_0: ExecutionContext) { return inst; },
      reduceOn(_0: () => LetNamesCollectorNew) { return inst; },
      finish: memoize(() => ({
        elements: () => undefined,
        error: () => freeze({ message }),
      }))
    });
    return inst satisfies LetNamesCollectorNew;
  },
  make(mNames: string[], mOperator: string, mDependeeNames: string[], mArgsNode: AstTupleNode) {
    const { beforeFinish, memoizedFinish } = FinishingMemoization.make();
    const inst = freeze({
      reduceOn: beforeFinish((_0: () => LetNamesCollectorNew): LetNamesCollectorNew => {
        return LetNamesCollectorNew.makeErroneous('too many operators');
      }),
      finish: memoizedFinish(() => {
        return LetNamesCollectionNew.make(mNames, mOperator, mDependeeNames, mArgsNode);
      })
    });
    return inst satisfies LetNamesCollectorNew;
  },
  makeEmpty() {
    const inst = freeze({
      setType(_0: ExecutionContext): LetNamesCollectorNew {
        return inst;
      },
      reduceOn(reduce: () => LetNamesCollectorNew) {
        return reduce();
      },
      finish: memoize(() => freeze({
        elements: () => [],
        error: () => StandardError.make().error()
      }))
    });
    return inst satisfies LetNamesCollectorNew;
  }
});
