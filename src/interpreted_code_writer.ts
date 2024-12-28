import { Helpers } from './helpers';
import {
  CodeWriter,
  PrintCodeWriter,
  ReadablePrintCodeWriter
} from './code_writer';
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

const DeferredWriter = freeze({
  make(mImmediateWriter: CodeWriter) {
    const mInstructions: (() => void)[] = [];
    const inst = freeze({
      pushRepresentation(i: number): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.pushRepresentation(i); });
        return inst;
      },
      addIntegers(): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.addIntegers(); });
        return inst;
      },
      subtractIntegers(): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.subtractIntegers(); });
        return inst;
      },
      multiplyIntegers(): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.multiplyIntegers(); });
        return inst;
      },
      loadInteger(offset: number): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.loadInteger(offset); });
        return inst;
      },
      storeInteger(offset: number): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.storeInteger(offset); });
        return inst;
      },
      askString(): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.askString(); });
        return inst;
      },
      askInteger(): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.askInteger(); });
        return inst;
      },
      pushFunctionIndex(_0: (codeWriter: CodeWriter) => void): CodeWriter {
        throw new Error('unimplemented');
      },
      forPrintMethod(fn: (cwp: PrintCodeWriter) => void): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.forPrintMethod(fn); });
        return inst;
      },
      drop(): CodeWriter {
        mInstructions.push(() => { mImmediateWriter.drop(); });
        return inst;
      },
      indirectCall(signatureIndex: number) {
        mInstructions.push(() => { mImmediateWriter.indirectCall(signatureIndex); });
        return inst;
      },
      runInstructions() {
        mInstructions.forEach((fn: () => void) => fn());
      }
    });
    return inst;
  }
});
type DeferredWriter = ReturnType<typeof DeferredWriter.make>;

const ImmediateWriter = freeze({
  make(mStack: PersistentStack<number>,
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
      pushFunctionIndex(definer: (codeWriter: CodeWriter) => void): CodeWriter {
        const top = DeferredWriter.make(inst);
        mStack.push( mDeferredWriters.length );
        mDeferredWriters.push(top);
        definer(top);
        return inst;
      },
      forPrintMethod(fn: (cwp: PrintCodeWriter) => void): CodeWriter {
        const rpcw = ReadablePrintCodeWriter.make();
        fn(rpcw);
        const mParams: number[] = [];
        while (mParams.length < rpcw.parameterCount()) {
          mParams.push( mStack.pop() ?? (() => {
            throw new Error('stack is empty');
          })() );
        }
        mParams.reverse();
        rpcw.forEach((name: string, idx: number) => {
          switch (name) {
          case 'printInteger':
            mInjections.putsFunction( `${mParams[idx]}` ) ;
            break;
          case 'printString':
            mInjections.
              putsFunction(mStringPool.reverseLookUp(mParams[idx]) ??
                           '<??INVALID INDEX??>');
            break;
          default: break;
          }
        });

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
});

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
    pushFunctionIndex(definer: (codeWriter: CodeWriter) => void) {
      definer(makeImmediateWriter());
      return inst;
    },
    indirectCall(n: number) {
      return makeImmediateWriter().indirectCall(n);
    },
    drop(): CodeWriter {
      return makeImmediateWriter().drop();
    },
    forPrintMethod(fn: (cwp: PrintCodeWriter) => void): CodeWriter {
      return makeImmediateWriter().forPrintMethod(fn);
    }
  });
  return inst satisfies CodeWriter;
}

export const InterpretedCodeWriter = freeze({
  make: construct,
  defaultInjections
});
