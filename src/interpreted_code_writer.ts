import { Helpers } from './helpers';
import { CodeWriter } from './code_writer';
import { MemoryArray } from './memory_array';
import { StringPool } from './string_pool';
import { ImmediateWriter } from './interpreted_code_writer/immediate_writer';
import { ObjectType } from './object_type';

const { freeze } = Helpers;

const { defaultInjections } = ImmediateWriter;

function construct
  (mStringPool: StringPool,
   mInjections = defaultInjections()): CodeWriter
{
  const mStack = mInjections.makeStack(() => Infinity);
  const mMemory = mInjections.makeMemory();
  
  mMemory.store(MemoryArray.stackPointerLocation(), 4);
  function makeImmediateWriter() {
    return ImmediateWriter.make(mStack, mMemory, mStringPool, mInjections);
  }
  const inst = freeze({
    pushRepresentation(i: number): CodeWriter {
      return makeImmediateWriter().pushRepresentation(i);
    },
    addIntegers(): CodeWriter {
      return makeImmediateWriter().addIntegers();
    },
    subtractIntegers(): CodeWriter {
      return makeImmediateWriter().subtractIntegers();
    },
    multiplyIntegers(): CodeWriter {
      return makeImmediateWriter().multiplyIntegers();
    },
    loadInteger(offset: number): CodeWriter {
      return makeImmediateWriter().loadInteger(offset);
    },
    storeInteger(offset: number): CodeWriter {
      return makeImmediateWriter().storeInteger(offset);
    },
    askString(): CodeWriter {
      return makeImmediateWriter().askString();
    },
    askInteger(): CodeWriter {
      return makeImmediateWriter().askInteger();
    },
    pushFunctionIndex(expectedRt: ObjectType, definer: (codeWriter: CodeWriter) => void) {
      definer(makeImmediateWriter());
      if (mStack.count() !== expectedRt.sizeInBytes() / 4) {
        throw new Error(`stack must be balanced with return type, ` +
                        `${mStack.count()} items left on stack`);
      }
      return inst;
    },
    indirectCall(n: number) {
      return makeImmediateWriter().indirectCall(n);
    },
    drop(): CodeWriter {
      return makeImmediateWriter().drop();
    },
    printString(): CodeWriter {
      return makeImmediateWriter().printString();
    },
    printInteger(): CodeWriter {
      return makeImmediateWriter().printInteger();
    },
  });
  return inst satisfies CodeWriter;
}

export const InterpretedCodeWriter = freeze({
  make: construct,
  defaultInjections
});
