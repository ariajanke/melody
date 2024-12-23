import { Helpers } from './helpers';
import { CodeWriter } from './function_type';
import { MemoryArray } from './memory_array';
import { PersistentStack } from './persistent_stack';
import { StringPool } from './string_pool';

const { freeze, memoize } = Helpers;

const defaultInjections = memoize(() => freeze({
  putsFunction(_0: string) {},
  askIntegerFunction: (() => {
    let i = 0;
    return () => i++;
  }) (),
  makeStack: PersistentStack.make<number>,
  makeMemory: MemoryArray.make
}));

function construct
  (mStringPool: StringPool,
   injections = defaultInjections()): CodeWriter
{
  const mStack = injections.makeStack(() => Infinity);
  const mMemory = injections.makeMemory();
  mMemory.store(MemoryArray.stackPointerLocation(), 1);
  const inst = freeze({
    pushInteger(i: number): CodeWriter {
      mStack.push(i);
      return inst;
    },
    addIntegers(): CodeWriter {
      mStack.push(mStack.pop() + mStack.pop());
      return inst;
    },
    subtractIntegers(): CodeWriter {
      const lhs = mStack.pop();
      const rhs = mStack.pop();
      mStack.push(rhs - lhs);
      return inst;
    },
    multiplyIntegers(): CodeWriter {
      mStack.push(mStack.pop()*mStack.pop());
      return inst;
    },
    loadInteger(): CodeWriter {
      mStack.push( mMemory.load( mStack.pop() ) );
      return inst;
    },
    storeInteger(): CodeWriter {
      const toStore = mStack.pop();
      const at = mStack.pop();
      mMemory.store(at, toStore);
      return inst;
    },
    printInteger(): CodeWriter {
      injections.putsFunction( `${mStack.pop()}` );
      return inst;
    },
    printString(): CodeWriter {
      const strIdx = mStack.pop();
      injections.putsFunction( mStringPool.reverseLookUp(strIdx) ?? '<??INVALID INDEX??>');
      return inst;
    },
    askString(): CodeWriter {
      mStack.push( mStringPool.askString() );
      return inst;
    },
    askInteger(): CodeWriter {
      mStack.push( injections.askIntegerFunction() );
      return inst;
    },
    swapTopTwo(): CodeWriter {
      const a = mStack.pop();
      const b = mStack.pop();
      mStack.push(a);
      mStack.push(b);
      return inst;
    },
    drop(): CodeWriter {
      mStack.pop();
      return inst;
    }
  });
  return inst;
}

export const InterpretedCodeWriter = freeze({
  make: construct,
  defaultInjections
});
