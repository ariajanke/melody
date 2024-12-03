import { Helpers, FinishingMemoization, StandardError } from './helpers';
import { type ExecutionContext } from './execution_context';
import { LetNamesCollection } from './let_names_collection';
import { type AstTupleNode } from './ast_tuple_node';
import { type ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

export type LetNamesCollector = {
  setType: (context: ExecutionContext) => LetNamesCollector,
  reduceOn: (fn: () => LetNamesCollector) => void,
  finish: () => LetNamesCollection
};

export const LetNamesCollector = freeze({
  makeErroneous: (message: string) => {
    const inst = freeze({
      setType(_0: ExecutionContext) { return inst; },
      reduceOn(_0: () => LetNamesCollector) { return inst; },
      finish: memoize(() => ({
        elements: () => undefined,
        error: () => freeze({ message }),
      }))
    });
    return inst satisfies LetNamesCollector;
  },
  make(mNames: string[], mOperator: string, mArgsNode: AstTupleNode) {
    const { beforeFinish, memoizedFinish } = FinishingMemoization.make();
    let mType: ObjectType | undefined = undefined;
    const inst = freeze({
      setType: beforeFinish((context: ExecutionContext): LetNamesCollector => {
        const { resolve, error } = context.executionTypeOf( mArgsNode );
        const type = resolve();
        if (type) {
          mType = type;
          return inst;
        }
        return LetNamesCollector.makeErroneous(error().message);
      }),
      reduceOn: beforeFinish((_0: () => LetNamesCollector) =>
        LetNamesCollector.makeErroneous('too many operators')),
      finish: memoizedFinish(() => {
        if (!mType) {
          return LetNamesCollection.
            makeErroneous('type was not set');
        }

        return LetNamesCollection.make(mNames, mOperator, mType, mArgsNode);
      })
    });
    return inst satisfies LetNamesCollector;
  },
  makeEmpty() {
    const inst = freeze({
      setType(_0: ExecutionContext): LetNamesCollector {
        return inst;
      },
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
