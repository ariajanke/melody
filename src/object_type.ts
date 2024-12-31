import { Helpers } from './helpers';
import {
  FunctionLookUpTable,
  IncompleteFunctionLookUpTable
} from './function_look_up_table';

const { freeze, memoize } = Helpers;

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionLookUpTable | undefined,
  uid: () => symbol,
  decompose: () => Readonly<ObjectType[]>,
  sizeInBytes: () => number
  forEachName: (fn: (name: string, table: FunctionLookUpTable) => void) => void
}

// There can only be one instance of a Tuple, for any sequence of unique type
// ids
// given [x(k), x(k + 1), x(k + 2), ...], *always* maps to s(x)
// though "String" maybe a different type depending on the context
const TupleObjectFactory = (() => {
  type TupleLookUpTableEntry = {
    object: ObjectType,
    [uid: symbol]: TupleLookUpTableEntry | undefined
  };

  const makeInstance = (name: string, types: Readonly<ObjectType[]>): ObjectType => freeze({
    lookUp: memoize(() => IncompleteFunctionLookUpTable.make().finish()),
    name: () => name,
    uid: memoize(Symbol),
    decompose: () => types,
    forEachName(_0: (name: string, table: FunctionLookUpTable) => void) {},
    sizeInBytes: memoize(() => types.
      map((type: ObjectType) => type.sizeInBytes()).
      reduce((prev: number, cur: number) => prev + cur, 0))
  });

  const sTable: TupleLookUpTableEntry = { object: makeInstance('Tuple()', []) };

  return freeze({
    make(types: Readonly<ObjectType[]>) {
      // by definition, a tuple of a single type is that type
      if (types.length === 1) {
        return types[0];
      }
      
      let seekingOn = sTable;
      let tupleName = 'Tuple(';
      types.forEach((type: ObjectType, idx: number) => {
        tupleName += type.name();
        seekingOn = seekingOn[type.uid()] ??=
          { object: makeInstance(`${tupleName})`, types.slice(0, idx + 1)) };
        tupleName += ', ';
      });
      return seekingOn.object;
    }
  });
})();

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
