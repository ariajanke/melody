import { Helpers } from './helpers';

// a few assumptions are made about this thing's usage which requires some care
// and attention
export interface PersistentStack<Type> {
  push: () => Type,
  pop: () => Type,
  isEmpty: () => boolean
}

export const PersistentStack = (() => {
  const { freeze } = Helpers;

  function make<Type>(mDefaultMake: () => Type) {
    const mMembers: Type[] = [];
    let mPosition = -1;

    function _verifyNotEmpty() {
      if (!isEmpty()) return;
      throw Error('Stack is empty');
    }

    function push(member?: Type): Type {
      const { length } = mMembers;
      if (mPosition + 1 === length) {
        mMembers.push(member ?? mDefaultMake());
      }
      ++mPosition;
      return mMembers[mPosition];
    }

    function pop(): Type {
      _verifyNotEmpty();
      const rv = mMembers[mPosition];
      --mPosition;
      return rv;
    }

    function isEmpty() {
      return mPosition === -1;
    }

    return freeze({ push, pop, isEmpty });
  }

  return freeze({ make });
})();
