import { Helpers } from '../helpers';
import { MemoryArray } from '../memory_array';
import { PersistentStack } from './persistent_stack';

const { memoize, makeCounter } = Helpers;

export const defaultInjections = memoize(() => ({
  putsFunction(_0: string) {},
  makeAskIntegerFunction: makeCounter,
  makeStack: PersistentStack.make<number>,
  makeMemory: MemoryArray.make
}));
