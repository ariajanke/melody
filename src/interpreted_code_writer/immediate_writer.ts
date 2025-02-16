import { CodeWriter } from '../code_writer';
import { MemoryArray } from '../memory_array';
import { PersistentStack } from '../persistent_stack';
import { StringPool } from '../string_pool';
import { Helpers } from '../helpers';
import { DeferredWriter } from './deferred_writer';
import { ObjectType } from '../object_type';

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
  (mStack: PersistentStack<number>,
   mMemory: MemoryArray,
   mStringPool: StringPool,
   mInjections = defaultInjections()): CodeWriter
{
  const { stackPointerLocation } = MemoryArray;
  const mDeferredWriters: DeferredWriter[] = [];
  const inst = freeze({
    pushRepresentation(i: number): CodeWriter {
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
    loadInteger(offset: number): CodeWriter {
      if (offset % 4 !== 0) {
        throw new Error('offset must be divisible by four, WASM addresses memory by byte');
      }
      mStack.push( mMemory.load( offset + mMemory.load( stackPointerLocation() ) ));
      return inst;
    },
    storeInteger(offset: number): CodeWriter {
      if (offset % 4 !== 0) {
        throw new Error('offset must be divisible by four, WASM addresses memory by byte');
      }
      const toStore = mStack.pop();
      mMemory.
        store(offset + mMemory.load( stackPointerLocation() ), toStore);
      return inst;
    },
    askString(): CodeWriter {
      mStack.push( mStringPool.askString() );
      return inst;
    },
    askInteger(): CodeWriter {
      mStack.push( mInjections.askIntegerFunction() );
      return inst;
    },
    pushFunctionIndex(_0: ObjectType, definer: (codeWriter: CodeWriter) => void): CodeWriter {
      const top = DeferredWriter.make(inst);
      mStack.push( mDeferredWriters.length );
      mDeferredWriters.push(top);
      definer(top);
      return inst;
    },
    printString() {
      const param = mStack.pop();
      mInjections.
        putsFunction(mStringPool.reverseLookUp(param) ?? '<??INVALID INDEX??>');
      return inst;
    },
    printInteger() {
      mInjections.putsFunction( `${mStack.pop()}` ) ;
      return inst;
    },
    indirectCall(signatureIndex: number) {
      const funcToRun = mStack.pop();
      if (signatureIndex !== 0) {
        throw new Error('not supported/unimplemented');
      }
      mDeferredWriters[funcToRun].runInstructions();
      return inst;
    },
    drop(): CodeWriter {
      mStack.pop();
      return inst;
    }
  });
  return inst;
}

export const ImmediateWriter = freeze({
  defaultInjections,
  make: construct
});
