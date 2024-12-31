import { Helpers } from './helpers';

const { freeze } = Helpers;

export interface StackReversal {
  pushWord(): StackReversal,
  forNested(fn: (rsr: ReadableStackReversal) => void): StackReversal
};

export interface ReadableStackReversal extends StackReversal {
  count(): number,
  forEach(fn: (idx: number) => void): void
};

export const ReadableStackReversal = freeze({
  make() {
    let mLength = 0;
    const inst = freeze({
      pushWord() {
        ++mLength;
        return inst;
      },
      forNested(fn: (rsr: ReadableStackReversal) => void) {
        fn(inst);
        return inst;
      },
      count: () => mLength,
      forEach(fn: (idx: number) => void) {
        for (let i = 0; i < mLength; ++i)
          { fn(i); }
      }
    });
    return inst satisfies ReadableStackReversal;
  }
});

export interface CodeWriter {
  addIntegers(): CodeWriter,
  askInteger(): CodeWriter,
  askString(): CodeWriter,
  printString(): CodeWriter,
  printInteger(): CodeWriter,
  drop(): CodeWriter
  indirectCall(signatureIndex: number): CodeWriter,
  loadInteger(offset: number): CodeWriter,
  multiplyIntegers(): CodeWriter,
  pushFunctionIndex(definer: (codeWriter: CodeWriter) => void): CodeWriter,
  pushRepresentation(num: number): CodeWriter,
  storeInteger(offset: number): CodeWriter,
  subtractIntegers(): CodeWriter,
  forStackReversal(fn: (sr: StackReversal) => void): CodeWriter
}
