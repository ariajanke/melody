import { Helpers } from './helpers';
import { ContextVariable } from './context_variable';

const { freeze } = Helpers;

export const ParameterFit = freeze({
  isLike: Symbol(),
  isType: Symbol(),
  isInterface: Symbol()
});

interface Parameter {
  fitType: symbol,
  interfaceType: undefined,
  objectType: symbol
}

interface ReturnType {
  typeUid: symbol
}

interface FunctionTypeBase {
  arguments_: () => Readonly<Parameter[]>,
  returns: () => Readonly<ReturnType[]>,
  uid: () => symbol,
  isComplete: () => boolean,
  name: () => string
}

interface FunctionType extends FunctionTypeBase {
  satisfactionDegree: (fn: FunctionType) => number | undefined,
}

interface IncompleteFunctionType extends FunctionTypeBase {
  setName: (name: string) => IncompleteFunctionType,
  setArguments: (args: Readonly<Parameter[]>) => IncompleteFunctionType,
  setReturns: (args: Readonly<ReturnType[]>) => IncompleteFunctionType,
  finish: () => FunctionType
};

const IncompleteFunctionType = (() => {
  const reservedAnonymouseName = '<anonymous>';

  function make(): IncompleteFunctionType {
    const mUid = Symbol();
    const mArguments_: Parameter[] = [];
    const mReturns   : ReturnType[] = [];
    let mName = reservedAnonymouseName;

    const inst = freeze({
      arguments_,
      returns,
      uid,
      isComplete,
      setName,
      setArguments,
      setReturns,
      name,
      finish
    });

    function arguments_(): Readonly<Parameter[]>
      { return mArguments_; }

    function returns(): Readonly<ReturnType[]>
      { return mReturns; }

    function uid(): symbol { return mUid; }

    function isComplete(): boolean { return false; }

    function setName(name: string): IncompleteFunctionType {
      mName = name;
      return inst;
    }

    function setArguments(args: Readonly<Parameter[]>): IncompleteFunctionType {
      mArguments_.length = 0;
      mArguments_.push(...args);
      return inst;
    }

    function setReturns(rets: Readonly<ReturnType[]>): IncompleteFunctionType {
      mReturns.length = 0;
      mReturns.push(...rets);
      return inst;
    }

    function name() { return mName; }

    function finish() {
      return FunctionType.make(inst);
    }

    return inst;
  }

  return freeze({ make, reservedAnonymouseName });
})();

export const FunctionType = (() => {
  function satisfactionDegreeOfParam
    (lhs: Parameter, rhs: Parameter): number | undefined
  {
    if (lhs.fitType === ParameterFit.isType &&
        rhs.fitType === ParameterFit.isType &&
        lhs.objectType === rhs.objectType)
    {
      return 0;
    }
  }

  function satisfactionDegreeOfArguments
    (lhs: Readonly<Parameter[]>, rhs: Readonly<Parameter[]>)
  {
    const length = Math.min(lhs.length, rhs.length);
    let degree = 0;
    for (let i = 0; i < length; ++i) {
      const lhsP = lhs[i];
      const rhsP = rhs[i];
      const deg = satisfactionDegreeOfParam( lhsP, rhsP );
      if (deg !== 0) return;
      degree += deg;
    }
    return degree;
  }

  function satisfactionDegreeOfReturns
    (lhs: Readonly<ReturnType[]>, rhs: Readonly<ReturnType[]>): number | undefined
  {
    const length = Math.min(lhs.length, rhs.length);
    for (let i = 0; i < length; ++i) {
      if (lhs[i].typeUid !== rhs[i].typeUid) {
        return undefined;
      }
    }
    return 0;
  }

  function make(base: FunctionTypeBase): FunctionType {
    const { arguments_, returns, uid, name } = base;

    // 0 meaning 1-1 match
    // undefined for does not match at all
    function satisfactionDegree(fn: FunctionType) {
      if (fn.arguments_().length !== arguments_().length ||
          fn.returns   ().length !== returns   ().length)
      { return undefined; }
      const argDeg =
        satisfactionDegreeOfArguments(fn.arguments_(), arguments_());
      if (argDeg !== 0) return;
      const rtDeg = satisfactionDegreeOfReturns(fn.returns(), returns());
      if (rtDeg !== 0) return;
      return argDeg + rtDeg;
    }

    function isComplete() { return true; }

    return freeze({
      satisfactionDegree, arguments_, returns, uid, name, isComplete
    });
  }

  return freeze({
    make,
    satisfactionDegreeOfParam,
    satisfactionDegreeOfArguments
  });
})();

const FunctionLookUpTable = (() => {

})();

export interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionType,
  uid: symbol,
  setLookUp: (lookupTable: { [name: string]: FunctionType }) => ObjectType,
  asSingluarParameter: () => Readonly<Parameter[]>
}

export const ObjectType = (() => {
  const { memoize } = Helpers;

  function makeUidFor(name: string) {
    switch (name) {
    case 'Integer': return ContextVariable.types.integer;
    case 'String' : return ContextVariable.types.string;
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

  return freeze({ make });
})();

export interface ObjectLookUpTable {
  addBuiltinTypes: () => ObjectLookUpTable,
  lookUpByType: (typeUid: symbol) => ObjectType
}

export const ObjectLookUpTable = (() => {
  const kBuiltinTypes = (() => {
    const integer_ = ObjectType.make('Integer');
    const string_ = ObjectType.make('String');

    const add = IncompleteFunctionType.
      make().
      setName('+').
      setArguments(integer_.asSingluarParameter()).
      setReturns  ([{ typeUid: ContextVariable.types.integer }]).
      finish();

    const sub = IncompleteFunctionType.
      make().
      setName('-').
      setArguments(integer_.asSingluarParameter()).
      setReturns  ([{ typeUid: ContextVariable.types.integer }]).
      finish();

    const assign = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(integer_.asSingluarParameter()).
      setReturns  ([{ typeUid: ContextVariable.types.integer }]).
      finish();

    const toS = IncompleteFunctionType.
      make().
      setName('toString').
      setArguments([]).
      setReturns  ([{ typeUid: ContextVariable.types.string }]).
      finish();

    const assignStr = IncompleteFunctionType.
      make().
      setName(':=').
      setArguments(string_.asSingluarParameter()).
      setReturns  ([{ typeUid: ContextVariable.types.string }]).
      finish();

    return freeze({
      Integer: integer_.
        setLookUp({
          ['+' ]: add,
          ['-' ]: sub,
          [':=']: assign,
          ['toString']: toS
        }),
      String: string_.
        setLookUp({
          [':=']: assignStr
        })
    });
  })();

  function make(): ObjectLookUpTable {
    const inst = freeze({ addBuiltinTypes, lookUpByType });
    const mLookUpByUid: { [uid: symbol]: ObjectType } = {};
    const mLookUpByName: { [name: string]: ObjectType } = {};

    function addBuiltinTypes(): ObjectLookUpTable {
      [kBuiltinTypes.Integer, kBuiltinTypes.String].forEach((objType: ObjectType) => {
        mLookUpByName[objType.name()] = objType;
        mLookUpByUid[objType.uid] = objType;
      });
      return inst;
    }

    function lookUpByType(typeUid: symbol): ObjectType {
      return mLookUpByUid[typeUid]
    }

    return inst;
  }

  return freeze({ make, kBuiltinTypes });
})();



const TypeSystem = (() => {

})();
