import { CodeWriter } from '../code_writer';
import { Helpers } from '../helpers';
import { StringPool } from '../string_pool';
import { StackSafetyWatcher } from './stack_safety_watcher';
import { defaultInjections } from './default_injections';

const { freeze } = Helpers;

type CodeRunnerFunctionName = keyof CodeWriter | 'functionEnd';
type CodeRunner = { [key in CodeRunnerFunctionName]: () => void | undefined };

function make
  (mCode: readonly (string | number)[],
   mIndexJumpTable: Readonly<{ [funcIndex: number]: number | undefined }>,
   mStringPool: StringPool,
   mInjections = defaultInjections())
{
  const mMemory = mInjections.makeMemory();
  const mStack = mInjections.makeStack(() => Infinity);
  const mCallStack = StackSafetyWatcher.make(mInjections.makeStack);
  const { putsFunction, makeAskIntegerFunction } = mInjections;
  const askIntegerFunction = makeAskIntegerFunction();
  const makeBinaryMathOp =
    (op: (a: number, b: number) => number): () => void =>
  {
    return (): void => {
      const b = mStack.pop();
      const a = mStack.pop();
      mStack.push(op(a, b));
      mProgramCounter += 1;
    };
  };
  let mProgramCounter = 0;

  const mCodeRunner: CodeRunner = {
    addIntegers: makeBinaryMathOp((a: number, b: number) => a + b),
    askInteger() {
      const input = askIntegerFunction();
      mStack.push(input);
      mProgramCounter += 1;
    },
    askString() {
      throw new Error('askString not implemented in code runner');
    },
    printString() {
      const a = mStack.pop();
      putsFunction(mStringPool.reverseLookUp(a) ?? '??<UNKNOWN STRING>??');
      mProgramCounter += 1;
    },
    printInteger() {
      const a = mStack.pop();
      putsFunction(a.toString());
      mProgramCounter += 1;
    },
    drop() {
      mStack.pop();
      mProgramCounter += 1;
    },
    multiplyIntegers: makeBinaryMathOp((a: number, b: number) => a * b),
    subtractIntegers: makeBinaryMathOp((a: number, b: number) => a - b),
    loadInteger() {
      const offset = mCode[mProgramCounter + 1] as number;
      const value = mMemory.load(offset);
      mStack.push(value);
      mProgramCounter += 2;
    },
    storeInteger() {
      const offset = mCode[mProgramCounter + 1] as number;
      // NOTE
      // a store apparently requies base then value be pushed in that order
      // wasm side is meant to compensate for this
      const value = mStack.pop();
      mMemory.store(offset, value);
      mProgramCounter += 2;
    },
    indirectCall() {
      const stackValue = mStack.pop();
      const jumpTo = mIndexJumpTable[stackValue];
      if (jumpTo === undefined) {
        throw new Error('Invalid function index for indirect call');
      }
      // +2, one after where we started from, and after the signature index
      mCallStack.pushReturnPoint(mProgramCounter + 2, mStack.count());
      mProgramCounter = jumpTo;
    },
    pushRepresentation() {
      const rep = mCode[mProgramCounter + 1] as number;
      mStack.push(rep);
      mProgramCounter += 2;
    },
    functionEnd() {
      // TODO support multiple function signatures
      //      the interpreter will have to start acting more like a WASM VM
      //      when we had multiple signatures
      mStack.pop();

      mProgramCounter =
        mCallStack.popReturnPoint(mStack.count()) ??
        mCode.length; 
    }
  };

  function oops() {
    const instruction = mCode[mProgramCounter];
    throw new Error(`Invalid instruction "${instruction}" at position ${mProgramCounter}`);
  }

  function beginAt(functionIndex: number): void {
    const jumpTo = mIndexJumpTable[functionIndex];
    if (jumpTo === undefined) {
      throw new Error('Invalid function index to begin at');
    }
    mProgramCounter = jumpTo;
  }

  function run(): boolean {
    let safety = 0;

    // NOTE dummy receiver for root function
    //      this is also present for the compiler
    //      the plan is to remove it once we have better function call support
    mStack.push( 0 ); 
    while (mProgramCounter < mCode.length) {
      if (safety++ > 10000) {
        throw new Error('Safety limit exceeded in code runner, likely an infinite loop');
      }
      const instruction = mCode[mProgramCounter];
      const f = (mCodeRunner[instruction as CodeRunnerFunctionName]) ?? oops;
      f();
    }
    return true;
  }

  return freeze({ beginAt, run });
}

export const InterpretedCodeRunner = freeze({ make, defaultInjections });
