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

interface FunctionType {
  arguments_: () => Readonly<Parameter[]>,
  returns: () => Readonly<Parameter[]>,
  uid: symbol,
  satisfactionDegree: (fn: FunctionType) => number | undefined
}

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

  function make(name?: string): FunctionType {
    function arguments_(): Readonly<Parameter[]> {
      return [];
    }

    function returns(): Readonly<Parameter[]> { return []; }

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

    return freeze({ arguments_, returns, uid: Symbol(), satisfactionDegree });
  }

  

  return freeze({ make });
})();

FunctionType.make('Function');

interface ObjectType {
  lookUp: (operation: string) => FunctionType
}

const FunctionLookUpTable = (() => {

})();

const ObjectType = (() => {
  function make(name: string, mLookupTable: { [name: string]: FunctionType }) {

    function lookUp(operation: string): FunctionType {
      return mLookupTable[operation];
    }

    return freeze({ lookUp });
  }

  return freeze({ make });
})();

const intt = ObjectType.make('Integer32', {
  ['+' ]: FunctionType.make(),
  ['-' ]: FunctionType.make(),
  [':=']: FunctionType.make()
});

intt.lookUp('+');

const TypeSystem = (() => {

})();
