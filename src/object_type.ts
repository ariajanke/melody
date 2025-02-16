import { Helpers } from './helpers';
import { FunctionLookUpTable } from './function_look_up_table';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionLookUpTable | undefined,
  uid: () => symbol,
  decompose: () => Readonly<ObjectType[]>,
  sizeInBytes: () => number
  forEachName: (fn: (name: string, table: FunctionLookUpTable) => void) => void
}

export const ObjectType = (() => {
  function make
    (name: string = '<anonymous>',
     size: number = 0,
     mLookupTable: { [name: string]: FunctionLookUpTable } = {}): ObjectType
  {
    const inst: ObjectType = freeze({
      lookUp,
      name: () => name,
      uid: memoize(Symbol),
      decompose: memoize(() => [inst]),
      forEachName,
      sizeInBytes: () => size
    });

    function forEachName(fn: (name: string, table: FunctionLookUpTable) => void) {
      Object.keys(mLookupTable).forEach((name: string) => {
        fn(name, mLookupTable[name]);
      });
    }

    function lookUp(operation: string): FunctionLookUpTable | undefined {
      return mLookupTable[operation];
    }

    return inst;
  }

  return freeze({
    make,
    asTuple: TupleObjectFactory.make,
    emptyTupleInstance: memoize(() => TupleObjectFactory.make([])),
    wildCardFunctionName: () => '<any>' // NOTE: it'll appear in code as $<any>
  });
})();
