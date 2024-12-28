import { Helpers } from './helpers';

const { freeze } = Helpers;

export interface PrintCodeWriter {
  printInteger(): PrintCodeWriter,
  printString(): PrintCodeWriter,
}

export interface ReadablePrintCodeWriter extends PrintCodeWriter {
  parameterCount(): number,
  forEach(fn: (functionName: string, idx: number) => void): void,
  reset(): ReadablePrintCodeWriter
}

export const ReadablePrintCodeWriter = freeze({
  make(): ReadablePrintCodeWriter {
    let mParamCount = 0;
    const mPrintMethods: string[] = [];
    const inst = freeze({
      printInteger() {
        ++mParamCount;
        mPrintMethods.push('printInteger');
        return inst;
      },
      printString() {
        ++mParamCount;
        mPrintMethods.push('printString');
        return inst;
      },
      parameterCount: () => mParamCount,
      forEach(fn: (functionName: string, idx: number) => void) {
        mPrintMethods.forEach(fn);
      },
      reset(): ReadablePrintCodeWriter {
        mPrintMethods.length = 0;
        mParamCount = 0;
        return inst;
      }
    });
    return inst satisfies ReadablePrintCodeWriter;
  }
});

export interface CodeWriter {
  addIntegers(): CodeWriter,
  askInteger(): CodeWriter,
  askString(): CodeWriter,
  drop(): CodeWriter
  forPrintMethod(fn: (cwp: PrintCodeWriter) => void): CodeWriter,
  indirectCall(signatureIndex: number): CodeWriter,
  loadInteger(offset: number): CodeWriter,
  multiplyIntegers(): CodeWriter,
  pushFunctionIndex(definer: (codeWriter: CodeWriter) => void): CodeWriter,
  pushRepresentation(num: number): CodeWriter,
  storeInteger(offset: number): CodeWriter,
  subtractIntegers(): CodeWriter,
}
