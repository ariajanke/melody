import { Helpers } from '../helpers';
import {
  CodeWriter,
  StackReversal
} from '../code_writer';

const { freeze } = Helpers;

function construct(mImmediateWriter: CodeWriter) {
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
    printString(): CodeWriter {
      mInstructions.push(() => { mImmediateWriter.printString(); });
      return inst;
    },
    printInteger(): CodeWriter {
      mInstructions.push(() => { mImmediateWriter.printInteger(); });
      return inst;
    },
    forStackReversal(fn: (sr: StackReversal) => void): CodeWriter {
      mInstructions.push(() => { mImmediateWriter.forStackReversal(fn); });
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

export const DeferredWriter = freeze({ make: construct });
export type DeferredWriter = ReturnType<typeof DeferredWriter.make>;
