import { Helpers } from './helpers';
import {
  FunctionLookUpTable,
  IncompleteFunctionLookUpTable
} from './function_look_up_table';
import { ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

// const TupleFunctionLookUpTable

// There can only be one instance of a Tuple, for any sequence of unique type
// ids
// given [x(k), x(k + 1), x(k + 2), ...], *always* maps to s(x)
// though "String" maybe a different type depending on the context
export const TupleObjectFactory = (() => {
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
