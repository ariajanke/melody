const globalThis_ = (globalThis as unknown as { [name: string]: boolean | object } );
const kDebugMode: boolean = globalThis_['debug_mode'] as boolean ?? false;

export const Helpers = Object.freeze({
  expose,
  freeze: !kDebugMode ? Object.freeze : pass,
  mapValues,
  depthOneCopy,
  memoize,
  verifyInTesting,
  symbolToString: getSymbolThings().symbolToString,
  registerSymbolStrings: getSymbolThings().registerSymbolStrings,
  presenceAsserted
});


export type StandardErrorMessage = Readonly<{ message: string }>;
export type StandardErrorFn = (() => StandardErrorMessage);
export interface StandardError {
  setErrorFn: (fn: StandardErrorFn) => undefined,
  setErrorMessage: (message: string) => undefined,
  error: () => StandardErrorMessage,
  sharedErrorInstance: () => StandardError,
  hasErrorSet(): boolean
};

export const StandardError = (() => {
  const { freeze } = Helpers;

  const kErrorNotSetFn: StandardErrorFn = (): StandardErrorMessage =>
    { throw new Error('No error set, this method should not be called'); };

  function make(): StandardError {
    let mErrorFn = kErrorNotSetFn;
    let mInst: StandardError | undefined = undefined;

    function setErrorFn(fn: StandardErrorFn): undefined
      { mErrorFn = fn; }

    function setErrorMessage(message: string): undefined
      { mErrorFn = () => freeze({ message }); }

    function error(): StandardErrorMessage
      { return mErrorFn(); }

    function hasErrorSet(): boolean
      { return mErrorFn !== kErrorNotSetFn; }

    const sharedErrorInstance = (): StandardError =>
      mInst ??= freeze({
          setErrorFn, setErrorMessage, error, sharedErrorInstance, hasErrorSet
        });

    return sharedErrorInstance();
  }

  return freeze({ make });
})();

export const FinishingMemoization = (() => {
  const kUninitializedGuard = (): void => {
    throw new Error('No method was defined with "memoizedFinish"');
  };
  const kFinishAlreadyCalledGuard = (): void => {
    throw new Error('Finisher method already called');
  };
  return Helpers.freeze({
    make() {
      let mMemoizationGuard = kUninitializedGuard;
      return Helpers.freeze({
        beforeFinish<T extends unknown[], Rt>(fn: (...args: T) => Rt) {
          return (...args: T): Rt => {
            mMemoizationGuard();
            return fn(...args);
          };
        },
        memoizedFinish<ReturnType>(fn: () => ReturnType) {
          mMemoizationGuard = () => {};
          let mGetter = () => {
            const res = fn();
            mGetter = () => res;
            mMemoizationGuard = kFinishAlreadyCalledGuard;
            return res;
          };
          return mGetter;
        }
      });
    }
  });
})();

expose({ Helpers });

export interface TypeCheckable {
  type: () => symbol
}

export const TypeCheckable = (() => {
  function make() {
    const kTypeKey = Symbol();

    function hasCreated
      (thing: TypeCheckable | undefined): boolean
    { return thing?.type() === kTypeKey; }

    function type(): symbol { return kTypeKey; }

    return Helpers.freeze({ hasCreated, type });
  }

  return Helpers.freeze({
    make
  });
})();

function verifyInTesting() {
  if (kDebugMode) return;
  throw Error('Cannot be called outside of a testing environment');
}

function presenceAsserted<Type>(fn: () => Type | undefined) {
  return () => fn() ?? (() => {
    throw new Error('Presence assertion failed');
  })();
}

function pass<Type>(arg: Type): Readonly<Type> { return arg; }

function forEachKeyIn<Type>
  (obj: { [id: symbol | string]: Type },
   fn: (key: string | symbol) => void)
{
  Object.getOwnPropertySymbols(obj).forEach(fn);
  Object.getOwnPropertyNames(obj).forEach(fn);
}

function mapValues<FromType, ToType>
  (obj: { [id: symbol | string]: FromType },
   fn: (value: FromType, key: string | symbol) => ToType):
  { [id: symbol | string]: ToType }
{
  const transformedObj = obj as
    { [id: symbol | string]: unknown } as
    { [id: symbol | string]: ToType };
  forEachKeyIn(obj, (key: string | symbol): void => {
    transformedObj[key] = fn(obj[key], key);
  });
  return transformedObj;
}

function depthOneCopy<Type>
  (obj: { [id: symbol | string]: Type }): { [id: symbol | string]: Type }
{
  const copy: typeof obj = {};
  forEachKeyIn(obj, (key: string | symbol): void => {
    copy[key] = obj[key];
  });
  return copy;
}

function expose(braceEnclosedVar: { [name: string]: object }): void {
  const setToWindow = (k: string) => {
    globalThis_[k] = braceEnclosedVar[k];
  };
  return Object.keys(braceEnclosedVar).forEach(setToWindow);
}

function memoize<Type>(fn: () => Type): () => Type {
  let get = (): Type => {
    const v = fn();
    get = () => v;
    return v;
  };
  return () => get();
}

function getSymbolThings() {
  const impl = memoize(() => {
    const mRegistry: { [id: symbol]: string } = {};

    function symbolToString(id: symbol): string {
      const got = mRegistry[id];
      if (got) {
        return got;
      } else {
        return '<unregistered symbol>';
      }
    }

    function registerSymbolStrings
      (topName: string, symbolTable: { [name:string]: symbol }): void
    {
      Object.
        keys(symbolTable).
        forEach((v: string) => {
          mRegistry[symbolTable[v]] = `${topName}.${v}`;
        });
    }

    return Object.freeze({
      symbolToString,
      registerSymbolStrings
    });
  });

  return memoize(impl)();
}
