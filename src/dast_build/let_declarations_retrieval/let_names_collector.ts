import { DastNode } from '../../dast_build';
import { Helpers, FinishingMemoization, StandardError } from '../../helpers';
import { LetNameGlob, LetNamesSplitter } from './let_names_splitter';

const { freeze, memoize } = Helpers;

export type LetNamesCollector = {
  reduceOn: (fn: () => LetNamesCollector) => void,
  finish: () => LetNamesSplitter
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
  make(mNames: string[],
       mOperator: string,
       mDependeeNames: readonly string[],
       mArgsNode: DastNode)
  {
    const { beforeFinish, memoizedFinish } = FinishingMemoization.make();
    const inst = freeze({
      reduceOn: beforeFinish((_0: () => LetNamesCollector): LetNamesCollector => {
        return LetNamesCollector.makeErroneous('too many operators');
      }),
      finish: memoizedFinish(() => {
        const glob: LetNameGlob = {
          names: mNames,
          operator: mOperator,
          dependeeNames: mDependeeNames,
          tupleNode: mArgsNode
        };
        return LetNamesSplitter.make(glob);
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
