import { Helpers } from './helpers';
import { FunctionType, Parameter, ParameterFit } from './function_type';

const { freeze } = Helpers;

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionType,
  uid: symbol,
  setLookUp: (lookupTable: { [name: string]: FunctionType }) => ObjectType,
  asSingluarParameter: () => Readonly<Parameter[]>
}

export const ObjectType = (() => {
  const { memoize } = Helpers;

  const kBuiltInTypeUids = freeze({
    integer: Symbol(),
    string: Symbol()
  });

  function makeUidFor(name: string) {
    switch (name) {
    case 'Integer': return kBuiltInTypeUids.integer;
    case 'String' : return kBuiltInTypeUids.string;
    default: return Symbol();
    }
  }

  function make
    (name?: string): ObjectType
  {
    name ??= '<anonymous>';
    let mLookupTable: { [name: string]: FunctionType } = {};
    const inst = freeze({
      lookUp, name: () => name,
      uid: makeUidFor(name),
      setLookUp,
      asSingluarParameter: memoize(asSingluarParameter)
    });

    function setLookUp(lookupTable: { [name: string]: FunctionType }) {
      mLookupTable = lookupTable;
      return inst;
    }

    function lookUp(operation: string): FunctionType {
      return mLookupTable[operation];
    }

    function asSingluarParameter(): Readonly<Parameter[]> {
      return [{
        fitType: ParameterFit.isType,
        interfaceType: undefined,
        objectType: inst.uid
      }];
    }

    return inst;
  }

  return freeze({ make, builtInTypeUids: kBuiltInTypeUids });
})();
