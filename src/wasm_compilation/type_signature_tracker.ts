import { Helpers } from '../helpers';
import { type SymFunc } from './wasm_helpers';

type KnownTypesTable = {
  [key: symbol]: KnownTypesTable | undefined,
  isFor: 'parameters' | 'results' | undefined,
  index: number | undefined
};

const { freeze, memoize, expose } = Helpers;

function makeCounter() {
  let i = 0;
  return () => i++;
}
const makeEmptyTable = () =>
  ({ isFor: undefined, index: undefined });

const dividers: { [name: string]: { start: () => symbol } } = freeze({
  parameters: { start: memoize(Symbol) },
  results   : { start: memoize(Symbol) }
});

const class_ = freeze({
  make() {
    const mKnownTypesTable: KnownTypesTable = makeEmptyTable();
    const mCounter = makeCounter();

    function seekTableSpecificList
      (typesTable: KnownTypesTable,
       list: SymFunc[],
       isFor: 'parameters' | 'results')
    {
      const next =
        typesTable[dividers[isFor].start()] ??= { isFor, index: undefined };
      typesTable = next;
      list.forEach((keyFn: SymFunc) => {
        const next = typesTable[keyFn()] ??= { isFor, index: undefined };
        typesTable = next;
      });
      return typesTable;
    }

    function seekTable(parameters: SymFunc[], results: SymFunc[]) {
      const afterParams =
        seekTableSpecificList(mKnownTypesTable, parameters, 'parameters');
      return seekTableSpecificList(afterParams, results, 'results');
    }

    return freeze({
      indexFor:
        (parameters: SymFunc[], results: SymFunc[]): number | undefined =>
        seekTable(parameters, results).index,
      makeIndexFor:
        (parameters: SymFunc[], results: SymFunc[]): number =>
        seekTable(parameters, results).index ??= mCounter()
    });
  }
});

export const TypeSignatureTracker = class_;
export type TypeSignatureTracker = ReturnType<typeof class_.make>;
expose({ TypeSignatureTracker });
