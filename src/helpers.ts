const kDebugMode: boolean = globalThis['debug_mode'] ?? false;

export const Helpers = Object.freeze({
  expose,
  freeze: !kDebugMode ? Object.freeze : pass,
  mapValues,
  depthOneCopy,
  memoize,
});

export type StandardErrorsFn = (() => { message: string } | undefined);

expose({ Helpers });

function pass<Type>(arg: Type): Type { return arg; }

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

function expose(braceEnclosedVar: object): void {
  const setToWindow = (k: string) => {
    if (typeof window === 'undefined')
      return;
    window[k] = braceEnclosedVar[k];
  };
  return Object.keys(braceEnclosedVar).forEach(setToWindow);
}

function memoize<Type>(fn: () => Type): () => Type {
  let m: Type | undefined = undefined;
  let mSet = false;
  return () => {
    if (mSet) return m as Type;
    mSet = true;
    return m ??= fn();
  };
}
