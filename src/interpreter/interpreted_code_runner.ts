import { CodeWriter } from '../code_writer';
import { Helpers, raise } from '../helpers';
import { StringPool } from '../string_pool';
import { CallStackState } from './call_stack_state';
import { defaultInjections } from './default_injections';
import { MemoryArray } from '../memory_array';
import { PersistentStack } from './persistent_stack';

const { freeze } = Helpers;

type CodeRunnerFunctionName = keyof CodeWriter | 'functionEnd';
type CodeRunner = { [key in CodeRunnerFunctionName]: () => void | undefined };

interface ProgramState {
  memory: MemoryArray;
  stack: PersistentStack<number>;
  programCounter: number;
  stackPointer: number;
  code: Readonly<(string | number)[]>;
}

const StackPointerOperationsMixin = freeze({
  make(mState: ProgramState) {
    const { code, memory, stack } = mState;
    const pc = () => mState.programCounter;

    function storeParentStackPointer() {
      mState.programCounter += 1;
    }
    function incrementStackPointer() {
      mState.programCounter += 1;
    }
    function pushStackPointer() {
      raise('unimplemented');
      mState.programCounter += 1;
    }
    function loadInteger() {
      const offset = code[pc() + 1] as number;
      const value = memory.load(offset + mState.stackPointer);
      stack.push(value);
      mState.programCounter += 2;
    }
    function setStackPointer() {
      raise('unimplemented');
      mState.programCounter += 1;
    }

    function storeInteger() {
      const offset = code[pc() + 1] as number;
      // NOTE
      // a store apparently requies base then value be pushed in that order
      // wasm side is meant to compensate for this
      const value = stack.pop();
      memory.store(offset + mState.stackPointer, value);
      mState.programCounter += 2;
    }

    return freeze({
      storeParentStackPointer,
      incrementStackPointer,
      pushStackPointer,
      loadInteger,
      storeInteger,
      setStackPointer
     });
  }
});

const AluMixin = freeze({
  make(mState: ProgramState) {
    const makeBinaryMathOp =
      (op: (a: number, b: number) => number): () => void =>
    {
      return (): void => {
        const b = mState.stack.pop();
        const a = mState.stack.pop();
        mState.stack.push(op(a, b));
        mState.programCounter += 1;
      };
    };
    return freeze({
      addIntegers: makeBinaryMathOp((a: number, b: number) => a + b),
      multiplyIntegers: makeBinaryMathOp((a: number, b: number) => a * b),
      subtractIntegers: makeBinaryMathOp((a: number, b: number) => a - b)
    });
  }
});

const CallMixin = freeze({
  make(mState: ProgramState,
       mIndexJumpTable: Readonly<{ [funcIndex: number]: number | undefined }>,
       mMakeStack: typeof PersistentStack.make<number>)
  {
    const { stack } = mState;
    const mCallStack = CallStackState.make(mMakeStack);
    function indirectCall() {
      const stackValue = stack.pop();
      const jumpTo = mIndexJumpTable[stackValue];
      if (jumpTo === undefined) {
        raise('Invalid function index for indirect call');
      }
      // +2, one after where we started from, and after the signature index
      // idk what to do with the argument (to parent pointer)
      stack.pop(); // pop receiver

      mCallStack.pushReturnPoint(mState.programCounter + 2, stack.count());
      mState.programCounter = jumpTo;
    }

    function functionEnd() {
      mState.stack.pop();

      mState.programCounter =
        mCallStack.popReturnPoint(stack.count()) ??
        mState.code.length; 
    }

    function forStackPointer() {
      const option = mState.code[mState.programCounter + 1];
      if (typeof option === 'number') {
        raise(`Expected string option for forStackPointer, got number ${option}`);
      } else {
        mCallStack.forStackPointer(option, mState);
      }
      mState.programCounter += 2;
    }

    return freeze({
      setHalt() {
        mCallStack.pushReturnPoint(mState.code.length, stack.count());
      },
      mixins: { indirectCall, functionEnd, forStackPointer }
    });
  }
});

function make
  (mCode: readonly (string | number)[],
   mIndexJumpTable: Readonly<{ [funcIndex: number]: number | undefined }>,
   mStringPool: StringPool,
   mInjections = defaultInjections())
{
  const mState: ProgramState = {
    memory: mInjections.makeMemory(),
    stack: mInjections.makeStack(() => Infinity),
    programCounter: 0,
    stackPointer: 0,
    code: mCode
  };
  const { stack: mStack } = mState;
  const { putsFunction, makeAskIntegerFunction } = mInjections;
  const askIntegerFunction = makeAskIntegerFunction();
  
  const mCallMixins = CallMixin.make(mState, mIndexJumpTable, mInjections.makeStack);

  const mCodeRunner: CodeRunner = {
    ...StackPointerOperationsMixin.make(mState),
    ...AluMixin.make(mState),
    ...mCallMixins.mixins,
    askInteger() {
      const input = askIntegerFunction();
      mStack.push(input);
      mState.programCounter += 1;
    },
    askString() {
      raise('askString not implemented in code runner');
    },
    printString() {
      const a = mStack.pop();
      putsFunction(mStringPool.reverseLookUp(a) ?? '??<UNKNOWN STRING>??');
      mState.programCounter += 1;
    },
    printInteger() {
      const a = mStack.pop();
      putsFunction(a.toString());
      mState.programCounter += 1;
    },
    drop() {
      mStack.pop();
      mState.programCounter += 1;
    },
    pushRepresentation() {
      const rep = mCode[mState.programCounter + 1] as number;
      mStack.push(rep);
      mState.programCounter += 2;
    },
    duplicateTop() {
      const top = mStack.top();
      mStack.push(top);
      mState.programCounter += 1;
    }
  };

  function oops() {
    const instruction = mCode[mState.programCounter];
    raise(`Invalid instruction "${instruction}" at position ${mState.programCounter}`);
  }

  function beginAt(functionIndex: number): void {
    mCallMixins.setHalt();
    const jumpTo = mIndexJumpTable[functionIndex];
    if (jumpTo === undefined) {
      raise('Invalid function index to begin at');
    }
    mState.programCounter = jumpTo;
  }

  function run(): boolean {
    let safety = 0;

    // NOTE dummy receiver for root function
    //      this is also present for the compiler
    //      the plan is to remove it once we have better function call support
    mStack.push( 0 );
    while (mState.programCounter < mCode.length) {
      const instruction = mCode[mState.programCounter];
      const f = (mCodeRunner[instruction as CodeRunnerFunctionName]) ?? oops;
      f();
      if (safety++ > 10000) {
        raise(`Safety limit exceeded in code runner, last instruction was "${instruction}" at position ${mState.programCounter}`);
      }
      console.log(`Executed instruction "${instruction}" at position ${mState.programCounter}, stack has now ${mStack.count()} items`);
    }
    return true;
  }

  return freeze({ beginAt, run });
}

export const InterpretedCodeRunner = freeze({ make, defaultInjections });
