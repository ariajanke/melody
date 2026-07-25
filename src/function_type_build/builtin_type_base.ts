import {
  FunctionLookUpTable,
  ObjectType 
} from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { MemoryArray } from '../memory_array';

const { freeze, memoize } = Helpers;

const typeBaseDefaults = memoize((): ObjectType => freeze({
  name: () => { raise('write me'); },
  lookUp(_0: string | symbol): FunctionLookUpTable | undefined
    { return undefined; },
  detuplify() { return undefined; },
  uid: () => raise('write me'),
  sizeInBytes: () => MemoryArray.kWordSizeInBytes,
  sizeInStackItems: () => 1,
}));

export const BuiltinTypeBase = freeze({
  makeNewWithDefaults: (): ObjectType => freeze({
    ...typeBaseDefaults(),
    uid: memoize(Symbol)
  })
});

export const ConstantStringType = freeze({
  instance: memoize((): ObjectType =>
    freeze({
      ...BuiltinTypeBase.makeNewWithDefaults(),
      name: () => 'ConstantString',
    }))
});
