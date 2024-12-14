import { Helpers } from './helpers';
import { FunctionType } from './function_type';
import { FunctionLookUpTable, IncompleteFunctionLookUpTable } from './function_look_up_table';

const { freeze, memoize } = Helpers;

// export interface ObjectTypeWritable {
//   setLookUp: (lookupTable: { [name: string]: FunctionType }) => ObjectType,
//   setLookUpTable: (lookupTable: { [name: string]: FunctionLookUpTable }) => ObjectType
// }

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionLookUpTable | undefined,
  uid: () => symbol,
  decomposeAsParameters: () => Readonly<ObjectType[]>,
  // not going to attempt to remove this yet, but one day object types
  // will be immutable
  setLookUp: (lookupTable: { [name: string]: FunctionType }) => ObjectType,
  setLookUpTable: (lookupTable: { [name: string]: FunctionLookUpTable }) => ObjectType
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

  const makeInstance = (name: string, types: Readonly<ObjectType[]>) => freeze({
    lookUp: memoize(() => IncompleteFunctionLookUpTable.make().finish()),
    name: () => name,
    uid: memoize(Symbol),
    setLookUp(_0: { [name: string]: FunctionType }): ObjectType {
      throw new Error('Dont call me');
    },
    decomposeAsParameters: () => types,
    setLookUpTable(_0: { [name: string]: FunctionLookUpTable }) {
      throw new Error('Dont call me');
    }
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
      types.forEach((type: ObjectType) => {
        tupleName += type.name();
        seekingOn = seekingOn[type.uid()] ??=
          { object: makeInstance(`${tupleName})`, types) };
        tupleName += ', ';
      });
      return seekingOn.object;
    }
  });
})();

export const ObjectType = (() => {
  const { memoize } = Helpers;

  function makeForTuple(types: Readonly<ObjectType[]>): ObjectType {
    return TupleObjectFactory.make(types);
    // name ??= '<anonymous>';
    // const inst: ObjectType = freeze({
    //   lookUp: memoize(() => IncompleteFunctionLookUpTable.make().finish()),
    //   name: () => name,
    //   uid: memoize(Symbol),
    //   setLookUp(_0: { [name: string]: FunctionType }): ObjectType {
    //     throw new Error('Dont call me');
    //   },
    //   decomposeAsParameters: () => types,
    //   setLookUpTable(_0: { [name: string]: FunctionLookUpTable }) {
    //     throw new Error('Dont call me');
    //   }
    // });
    // return inst;
  }

  function make
    (name?: string): ObjectType
  {
    name ??= '<anonymous>';
    const mLookupTable: { [name: string]: FunctionLookUpTable } = {};
    const inst: ObjectType = freeze({
      lookUp,
      name: () => name,
      uid: memoize(Symbol),
      setLookUp,
      decomposeAsArguments: memoize((): Readonly<symbol[]> => [inst.uid()]),
      decomposeAsParameters: memoize(() => [inst]),
      setLookUpTable
    });

    function setLookUp(lookupTable: { [name: string]: FunctionType }) {
      Object.keys(lookupTable).forEach((name: string) => {
        mLookupTable[name] = IncompleteFunctionLookUpTable.
          make().
          push(lookupTable[name]).
          finish();
      });
      
      return inst;
    }

    function setLookUpTable(lookupTable: { [name: string]: FunctionLookUpTable }) {
      Object.keys(lookupTable).forEach((name: string) => {
        mLookupTable[name] = lookupTable[name];
      });
      return inst;
    }

    function lookUp(operation: string): FunctionLookUpTable | undefined {
      return mLookupTable[operation];
    }

    return inst;
  }

  return freeze({
    make,
    makeForTuple,
    emptyTupleInstance: memoize(() => makeForTuple([])),
    wildCardFunctionName: () => '$' // NOTE: it'll appear in code as $$
  });
})();
