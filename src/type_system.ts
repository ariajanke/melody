import { Helpers } from './helpers';

const { freeze } = Helpers;

const ParameterFit = freeze({
  isLike: Symbol(),
  isType: Symbol(),
  isInterface: Symbol()
});

interface Parameter {
  fit: symbol,
  fitName: string
}

interface FunctionTypeBase {
  arguments_: () => Readonly<Parameter[]>,
  returns: () => Readonly<Parameter[]>,
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
  setReturns: (args: Readonly<Parameter[]>) => IncompleteFunctionType,
  finish: () => FunctionType
};

const IncompleteFunctionType = (() => {
  const reservedAnonymouseName = '<anonymous>';

  function make(): IncompleteFunctionType {
    const mUid = Symbol();
    const mArguments_: Parameter[] = [];
    const mReturns   : Parameter[] = [];
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

    function returns(): Readonly<Parameter[]>
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

    function setReturns(rets: Readonly<Parameter[]>): IncompleteFunctionType {
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

const FunctionType = (() => {
  function satisfactionDegreeOfParam
    (lhs: Parameter, rhs: Parameter): number | undefined
  {
    if (lhs.fit === ParameterFit.isType &&
        rhs.fit === ParameterFit.isType &&
        lhs.fitName === rhs.fitName)
    {
      return 0;
    }
  }

  function satisfactionDegreeOfArray
    (lhs: Readonly<Parameter[]>, rhs: Readonly<Parameter[]>)
  {
    const length = Math.min(lhs.length, rhs.length);
    let degree = 0;
    for (let i = 0; i !== length; ++i) {
      const lhsP = lhs[i];
      const rhsP = rhs[i];
      const deg = satisfactionDegreeOfParam( lhsP, rhsP );
      if (!deg) return;
      degree += deg;
    }
    return degree;
  }

  function make(base: FunctionTypeBase): FunctionType {
    const { arguments_, returns, uid, name } = base;
    
    // 0 meaning 1-1 match
    // undefined for does not match at all
    function satisfactionDegree(fn: FunctionType) {
      if (fn.arguments_().length !== arguments_().length ||
          fn.returns   ().length !== returns   ().length)
      { return undefined; }

      const argDeg = satisfactionDegreeOfArray(fn.arguments_(), arguments_());
      if (!argDeg) return;
      const rtDeg = satisfactionDegreeOfArray(fn.returns(), returns());
      if (!rtDeg) return;
      return argDeg + rtDeg;
    }

    function isComplete() { return true; }

    return freeze({
      satisfactionDegree, arguments_, returns, uid, name, isComplete
    });
  }

  return freeze({ make });
})();

const FunctionLookUpTable = (() => {

})();

interface ObjectType {
  name: () => string,
  lookUp: (operation: string) => FunctionType,
  uid: symbol,
  setLookUp: (lookupTable: { [name: string]: FunctionType }) => ObjectType
}

const ObjectType = (() => {
  function make
    (name?: string): ObjectType
  {
    name ??= '<anonymous>';
    let mLookupTable: { [name: string]: FunctionType } = {};
    const inst = freeze({ lookUp, name: () => name, uid: Symbol(), setLookUp });

    function setLookUp(lookupTable: { [name: string]: FunctionType }) {
      mLookupTable = lookupTable;
      return inst;
    }

    function lookUp(operation: string): FunctionType {
      throw 'shit';
    }

    return inst;
  }

  return freeze({ make });
})();

const ObjectLookUpTable = (() => {
  function make() {
    function makeMemberType(): ObjectType {
      return ObjectType.make();
    }

    return freeze({ makeMemberType })
  }

  return freeze({ make });
})();

const add = IncompleteFunctionType.
  make().
  setName('+').
  setArguments([{ fit: ParameterFit.isType, fitName: 'Interger32' }]).
  setReturns  ([{ fit: ParameterFit.isType, fitName: 'Interger32' }]).
  finish();

const sub = IncompleteFunctionType.
  make().
  setName('-').
  setArguments([{ fit: ParameterFit.isType, fitName: 'Interger32' }]).
  setReturns  ([{ fit: ParameterFit.isType, fitName: 'Interger32' }]).
  finish();

const assign = IncompleteFunctionType.
  make().
  setName(':=').
  setArguments([{ fit: ParameterFit.isType, fitName: 'Interger32' }]).
  setReturns  ([{ fit: ParameterFit.isType, fitName: 'Interger32' }]).
  finish();

const toS = IncompleteFunctionType.
  make().
  setName('toString').
  setArguments([]).
  setReturns  ([{ fit: ParameterFit.isType, fitName: 'String' }]).
  finish();

const assignStr = IncompleteFunctionType.
  make().
  setName(':=').
  setArguments([{ fit: ParameterFit.isType, fitName: 'String' }]).
  setReturns  ([{ fit: ParameterFit.isType, fitName: 'String' }]).
  finish();

const intt = ObjectType.
  make('Integer32').
  setLookUp({
    ['+' ]: add,
    ['-' ]: sub,
    [':=']: assign,
    ['toString']: toS
  });

const strt = ObjectType.
  make('String').
  setLookUp({
    [':=']: assignStr
  });


const TypeSystem = (() => {

})();
