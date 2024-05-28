import { Helpers, PersistentStack } from './helpers';
import { type ContextVariable } from './context_variable';
import { type ObjectType } from './object_type';

const { freeze } = Helpers;

export const ParameterFit = freeze({
  isLike: Symbol(),
  isType: Symbol(),
  isInterface: Symbol()
});

export interface Parameter {
  fitType: symbol,
  interfaceType: undefined,
  objectType: symbol
}

export type BuiltInBinaryFunction =
  (stack: PersistentStack<ContextVariable>,
   lhs: ContextVariable,
   rhs: ContextVariable) => void;

interface FunctionTypeBase {
  arguments_: () => Readonly<Parameter[]>,
  returns: () => Readonly<ObjectType[]>,
  uid: () => symbol,
  isComplete: () => boolean,
  name: () => string,
  builtIn: () => BuiltInBinaryFunction | undefined
}

export interface FunctionType extends FunctionTypeBase {
  satisfactionDegree: (fn: FunctionType) => number | undefined,
  satisfactionDegreeOfArguments: (args: Readonly<Parameter[]>) =>
    number | undefined
  // assume function type for now
}

export interface IncompleteFunctionType extends FunctionTypeBase {
  setName: (name: string) => IncompleteFunctionType,
  setArguments: (args: Readonly<Parameter[]>) => IncompleteFunctionType,
  setReturns: (args: Readonly<ObjectType[]>) => IncompleteFunctionType,
  setBuiltin: (fn: BuiltInBinaryFunction) => IncompleteFunctionType,
  finish: () => FunctionType
};

export const IncompleteFunctionType = (() => {
  const reservedAnonymouseName = '<anonymous>';

  function make(): IncompleteFunctionType {
    const mUid = Symbol();
    const mArguments_: Parameter[] = [];
    const mReturns   : ObjectType[] = [];
    let mBuiltin: BuiltInBinaryFunction | undefined = undefined;
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
      finish,
      setBuiltin,
      builtIn: () => mBuiltin
    });

    function arguments_(): Readonly<Parameter[]>
      { return mArguments_; }

    function returns(): Readonly<ObjectType[]>
      { return mReturns; }

    function uid(): symbol { return mUid; }

    function isComplete(): boolean { return false; }

    function setName(name: string): IncompleteFunctionType {
      if (name === reservedAnonymouseName) {
        throw Error(`Cannot name function "${name}"`);
      }
      mName = name;
      return inst;
    }

    function setArguments(args: Readonly<Parameter[]>): IncompleteFunctionType {
      mArguments_.length = 0;
      mArguments_.push(...args);
      return inst;
    }

    function setReturns(rets: Readonly<ObjectType[]>): IncompleteFunctionType {
      mReturns.length = 0;
      mReturns.push(...rets);
      return inst;
    }

    function name() { return mName; }

    function finish() {
      return FunctionType.make(inst);
    }

    function setBuiltin(fn: BuiltInBinaryFunction): IncompleteFunctionType {
      mBuiltin = fn;
      return inst;
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

  function satisfactionDegreeOfReturns
    (lhs: Readonly<ObjectType[]>, rhs: Readonly<ObjectType[]>): number | undefined
  {
    const length = Math.min(lhs.length, rhs.length);
    for (let i = 0; i < length; ++i) {
      if (lhs[i].uid !== rhs[i].uid) {
        return undefined;
      }
    }
    return 0;
  }

  function make(base: FunctionTypeBase): FunctionType {
    const { arguments_, returns, uid, name, builtIn } = base;

    const inst = freeze({
      // 0 meaning 1-1 match
      // undefined for does not match at all
      satisfactionDegree: (fn: FunctionType): number | undefined => {
        if (fn.arguments_().length !== arguments_().length ||
            fn.returns   ().length !== returns   ().length)
        { return undefined; }
        const argDeg = inst.satisfactionDegreeOfArguments(fn.arguments_());
        if (argDeg !== 0) return;
        const rtDeg = satisfactionDegreeOfReturns(fn.returns(), returns());
        if (rtDeg !== 0) return;
        return argDeg + rtDeg;
      },
      satisfactionDegreeOfArguments: (rhs: Readonly<Parameter[]>):
        number | undefined =>
        {
          const lhs = arguments_();
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
        },
      arguments_,
      returns,
      uid,
      name,
      isComplete: () => true,
      builtIn
    });
    return inst;
  }

  return freeze({
    make,
    satisfactionDegreeOfParam//,
    // satisfactionDegreeOfArguments
  });
})();
