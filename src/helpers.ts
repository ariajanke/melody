export const Helpers = Object.freeze({
  expose,
  freeze: !window['debug_mode'] ? Object.freeze : pass,
  mapValues,
  depthOneCopy,
  memoize,
  // string: {
  //   characterClassOf,
  //   characterClasses: getCharacterClasses()
  // }
});

export type StandardErrorsFn = (() => { message: string } | undefined);

expose({ Helpers });

function getCharacterClasses() {
  return CharacterClasses;
}

const CharacterClasses = Object.freeze({
  numeric: Symbol(),
  alphabetic: Symbol(),
  operative: Symbol(),
  spacious: Symbol(),
  literal: Symbol()
});

function arrayAsCharacterSetFor(arr: string[], characterClass: symbol) {
  return arr.
    map((k: string) => ({ [k]: characterClass })).
    reduce(Object.assign);
}

const kCharacterToCharacterClass =
  Object.assign(
    arrayAsCharacterSetFor(
      [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
      ],
      CharacterClasses.numeric),
    arrayAsCharacterSetFor(
      [
        '=', ':', ',', '.', '(', ')', '{', '}'
      ],
      CharacterClasses.operative),
    arrayAsCharacterSetFor(
      [
        ' ', '\t', '\n'
      ],
      CharacterClasses.spacious),
    arrayAsCharacterSetFor(
      [
        '\'', '"'
      ],
      CharacterClasses.literal));

function characterClassOf(character: string): symbol {
  if (character.length !== 1) {
    throw Error(`"${character}" is not one character`);
  }
  return kCharacterToCharacterClass[character] ?? CharacterClasses.alphabetic;
}

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
  const setToWindow = (k: string) => window[k] = braceEnclosedVar[k];
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
