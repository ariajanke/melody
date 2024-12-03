import { Helpers } from './helpers';
import { FunctionType } from './function_type';
import { FunctionLookUpTable, IncompleteFunctionLookUpTable } from './function_look_up_table';

const { freeze } = Helpers;

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionLookUpTable | undefined,
  uid: symbol,
  setLookUp: (lookupTable: { [name: string]: FunctionType }) => ObjectType,
  decomposeAsArguments: () => Readonly<symbol[]>,
  setLookUpTable: (lookupTable: { [name: string]: FunctionLookUpTable }) => ObjectType
}

export const ObjectType = (() => {
  const { memoize } = Helpers;

  const kBuiltInTypeUids = freeze({
    integer   : Symbol(),
    string    : Symbol(),
    function_ : Symbol()
  });

  const kUidBuiltinStrategy:
    { [name: string]: symbol } =
  freeze({
    Integer : kBuiltInTypeUids.integer,
    String  : kBuiltInTypeUids.string ,
    // The *only* type of function that exist right now, is the "a block to
    // jump to" function. And that's it, for now.
    Function: kBuiltInTypeUids.function_
  });

  function makeUidFor(name: string) {
    return kUidBuiltinStrategy[name] ?? Symbol();
  }

  function makeForTuple(uids: Readonly<symbol[]>, name: string): ObjectType {
    name ??= '<anonymous>';
    const inst = freeze({
      lookUp: memoize(() => IncompleteFunctionLookUpTable.make().finish()),
      name: () => name,
      uid: makeUidFor(name),
      setLookUp(_0: { [name: string]: FunctionType }): ObjectType {
        throw new Error('Dont call me');
      },
      decomposeAsArguments: () => uids,
      setLookUpTable(_0: { [name: string]: FunctionLookUpTable }) {
        throw new Error('Dont call me');
      }
    });
    return inst;
  }

  function make
    (name?: string): ObjectType
  {
    name ??= '<anonymous>';
    const mLookupTable: { [name: string]: FunctionLookUpTable } = {};
    const inst = freeze({
      lookUp,
      name: () => name,
      uid: makeUidFor(name),
      setLookUp,
      decomposeAsArguments: memoize((): Readonly<symbol[]> => [inst.uid]),
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
    builtInTypeUids: kBuiltInTypeUids,
    makeForTuple
  });
})();
