import { Helpers } from './helpers';

const { freeze, memoize } = Helpers;

const kBuiltinNames = freeze({
  kPuts: 'puts'
});

type StringSet = { [name: string]: boolean | undefined };
const namesAsSet = memoize((): Readonly<StringSet> => Object.
  keys(kBuiltinNames).
  reduce((acc: StringSet, name: string) => {
    acc[kBuiltinNames[name as keyof typeof kBuiltinNames]] = true;
    return acc;
  }, {} as StringSet));

function isBuiltinFunctionName(name: string): boolean {
  return namesAsSet()[name] !== undefined;
}

export const BuiltinFunctionNames = freeze({
  ...kBuiltinNames,
  isBuiltinFunctionName
});
