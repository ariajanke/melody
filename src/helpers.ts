type NodeEnvVar = { env: { [name: string]: boolean } };
const globalThis_ = (globalThis as unknown as {
  [name: string]: boolean | object | NodeEnvVar
} );
globalThis_['debug_mode'] ??= (globalThis_['process'] as NodeEnvVar)?.env.DEBUG_MODE;
const kDebugMode: boolean = globalThis_['debug_mode'] as boolean ?? false;

export const Helpers = Object.freeze({
  expose,
  freeze: !kDebugMode ? Object.freeze : pass,
  makeCounter,
  mapValues,
  memoize,
  presenceAsserted,
  toNamedMap,
  verifyInTesting,
});

export type StandardErrorMessage = Readonly<{ message: string }>;
export type StandardErrorFn = (() => StandardErrorMessage);
export interface StandardError {
  setErrorFn: (fn: StandardErrorFn) => undefined,
  setErrorMessage: (message: string) => undefined,
  error: () => StandardErrorMessage,
  hasErrorSet(): boolean
};

export const StandardError = (() => {
  const { freeze } = Helpers;

  const kErrorNotSetFn: StandardErrorFn = (): StandardErrorMessage =>
    { raise('No error set, this method should not be called'); };

  function make(): StandardError {
    let mErrorFn = kErrorNotSetFn;
    
    function setErrorFn(fn: StandardErrorFn): undefined
      { mErrorFn = fn; }

    function setErrorMessage(message: string): undefined
      { mErrorFn = () => freeze({ message }); }

    function error(): StandardErrorMessage
      { return mErrorFn(); }

    function hasErrorSet(): boolean
      { return mErrorFn !== kErrorNotSetFn; }

    return freeze({
      setErrorFn, setErrorMessage, error, hasErrorSet
    });
  }

  return freeze({ make });
})();

export interface StandardErrorCollection {
  addErrorFn: (fn: StandardErrorFn) => undefined;
  addError: (message: string) => undefined;
  errors: () => Readonly<StandardErrorMessage[]>;
};

// export const StandardErrorCollection = (() => {
//   const { freeze } = Helpers;

//   function make() {
//     const mErrors: StandardErrorMessage[] = [];
//     function addErrorMessage(message: string): undefined
//       { mErrors.push({ message }); }
//     function addErrorFn(fn: StandardErrorFn): undefined
//       { addError(fn()); }
//     function errors(): Readonly<StandardErrorMessage[]>
//       { return mErrors; }
//     return freeze({ addErrorFn, errors });
//   }

//   return freeze({ make });
// })();

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

function expose(braceEnclosedVar: { [name: string]: object }): void {
  const setToWindow = (k: string) => {
    globalThis_[k] = braceEnclosedVar[k];
  };
  return Object.keys(braceEnclosedVar).forEach(setToWindow);
}

function memoize<Type>(fn: () => Type): () => Type {
  let memorized = false;
  let value: Type;

  return () => {
    if (memorized) { return value; }
    memorized = true;
    return value = fn();
  };
}

function makeCounter() {
  let count = 0;
  return () => count++;
}

function toNamedMap<StringUnion extends string>
  (arr: readonly StringUnion[]):
  { [name in StringUnion]: StringUnion }
{
  const temp:  { [name: string]: StringUnion }[] =
    arr.map((v: StringUnion) => ({ [v]: v }));
  return Object.assign({}, ...temp) as { [name in StringUnion]: StringUnion };
}

export const GenericSet = Object.freeze({
  make<T>(): Set<T> { return new Set<T>(); }
});

// melody will not have exceptions! hell no!
// but there still maybe a "throw my hands up" kind of function (ala std::terminate)
export function raise(message: string): never
  { throw new Error(message); }
