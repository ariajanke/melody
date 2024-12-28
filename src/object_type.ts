import { Helpers } from './helpers';
import { FunctionType } from './function_type';
import { FunctionLookUpTable, IncompleteFunctionLookUpTable } from './function_look_up_table';

const { freeze, memoize } = Helpers;

type LookUpLookUpTable = { [name: string]: FunctionLookUpTable };

export interface WritableObjectType {
  setName: (name: string) => WritableObjectType,
  pushFunctionTypeByName: (name: string, func: FunctionType) => WritableObjectType
  pushFunctionTableByName: (name: string, funcTable: FunctionLookUpTable) =>
    WritableObjectType
  pushFunctionTypes: (types: { [name: string]: FunctionType }) => WritableObjectType
  pushFunctionTables: (tables: LookUpLookUpTable) => WritableObjectType
  acceptMerge: (fn: (currentOffset: number) => ObjectType) => WritableObjectType,
  objectType: () => ObjectType
}

export const WritableObjectType = freeze({
  make() {
    let mName = '<anonymous>';
    let mPosition = 0;
    const mLookupTable: LookUpLookUpTable = {};

    function acceptMerge(fn: (currentOffset: number) => ObjectType): WritableObjectType {
      const objType = fn(mPosition);
      mPosition += objType.sizeInWords()*4;
      objType.forEachName((name: string, table: FunctionLookUpTable) => {
        mLookupTable[name] = table;
      });
      return inst;
    }

    function setName(name: string): WritableObjectType {
      mName = name;
      return inst;
    }

    function pushFunctionTypeByName(name: string, func: FunctionType): WritableObjectType {
      mLookupTable[name] = IncompleteFunctionLookUpTable.
        make().push(func).finish();
      return inst;
    }

    function pushFunctionTableByName(name: string, funcTable: FunctionLookUpTable):
      WritableObjectType
    {
      mLookupTable[name] = funcTable;
      return inst;
    }

    function pushFunctionTypes(types: { [name: string]: FunctionType }): WritableObjectType {
      Object.keys(types).forEach((name: string) => {
        inst.pushFunctionTypeByName(name, types[name]);
      });
      return inst;
    }

    function pushFunctionTables(tables: LookUpLookUpTable): WritableObjectType {
      Object.keys(tables).forEach((name: string) => {
        inst.pushFunctionTableByName(name, tables[name]);
      });
      return inst;
    }

    function objectType(): ObjectType {
      return ObjectType.make(mName, 0, mLookupTable);
    }

    const inst = freeze({
      acceptMerge,
      setName,
      pushFunctionTableByName,
      pushFunctionTypeByName,
      pushFunctionTypes,
      pushFunctionTables,
      objectType: memoize(objectType)
    });
    return inst;
  }
});

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionLookUpTable | undefined,
  uid: () => symbol,
  decompose: () => Readonly<ObjectType[]>,
  sizeInWords: () => number
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
    sizeInWords: memoize(() => types.
      map((type: ObjectType) => type.sizeInWords()).
      reduce((prev: number, cur: number) => prev + cur))
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
     mLookupTable: LookUpLookUpTable = {}): ObjectType
  {
    const inst: ObjectType = freeze({
      lookUp,
      name: () => name,
      uid: memoize(Symbol),
      decompose: memoize(() => [inst]),
      forEachName,
      sizeInWords: () => size
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
