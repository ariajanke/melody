import { CodeWriter } from '../code_writer';
import { FunctionType } from '../function_type_build';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

export interface StackSafetyChecker {
  check(ftype: FunctionType): StackSafetyChecker;
};

const StackTallyBase = freeze({
  make() {
    let mInternalCount = 0;
    const decrementCount = () => {
      --mInternalCount;
      return mInternalWriter;
    };
    const incrementCount = () => {
      ++mInternalCount;
      return mInternalWriter;
    };
    const mInternalWriter: CodeWriter = freeze({
      addIntegers: decrementCount,
      askInteger: incrementCount,
      askString: incrementCount,
      drop: decrementCount,
      indirectCall: (_0: number) => {
        // NOTE indirect call consume the following
        // - the function index
        // - receiver
        mInternalCount -= 2;
        return mInternalWriter;
      },
      loadInteger: incrementCount,
      multiplyIntegers: decrementCount,
      printInteger: decrementCount,
      printString: decrementCount,
      pushRepresentation: (_0: number) => incrementCount(),
      storeInteger: decrementCount,
      subtractIntegers: decrementCount,
      pushStackPointer: incrementCount,
      storeParentStackPointer: () => mInternalWriter,
      setStackPointer: decrementCount,
      duplicateTop: incrementCount,
      forStackPointer: (_0: 'saveToLocal' | 'restoreToGlobal') => mInternalWriter
    });

    return freeze({
      countFrom(...ftypes: FunctionType[]): number {
        mInternalCount = 0;
        for (const ftype of ftypes) {
          ftype.emit(mInternalWriter);
        }
        return mInternalCount;
      },
      count: () => mInternalCount
    });
  }
});

export const StackSafetyChecker = freeze({
  make(): StackSafetyChecker {
    const { count, countFrom } = StackTallyBase.make();

    const inst = freeze({
      check(ftype: FunctionType): StackSafetyChecker {
        countFrom(ftype);
        const { returns, parameters } = ftype;
        
        const delta = returns().sizeInStackItems() - parameters().sizeInStackItems();
        if (count() !== delta) {
          throw new Error(
            `Stack safety check failed: expected ${delta} ` +
            `items, but got ${count()}. (For function taking ` +
            `"${ftype.parameters().name()}", returning ` +
            `"${ftype.returns().name()}")`);
        }
        return inst;
      }
    });
    return inst;
  },
});
