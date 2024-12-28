import { Helpers } from '../helpers';
import { WasmCompiler } from './wasm_compiler';
import { WasmFunctionCodeWriter } from './wasm_function_code_writer';
import { PrintCodeWriter, type CodeWriter } from '../code_writer';

const { freeze } = Helpers;

export interface WasmCodeWriter extends CodeWriter {
  makeCompilerFromCode(): WasmCompiler
};

export const WasmCodeWriter = (() => {
  return freeze({
    make(): WasmCodeWriter {
      const mFunctionWriters: WasmFunctionCodeWriter[] = [];
      const mWriterStack: WasmFunctionCodeWriter[] = [];
      const topFunctionWriter = () =>
        mWriterStack[mWriterStack.length - 1] ??
        (() => { throw new Error('no top'); })();
      const inst = freeze({
        pushRepresentation(i: number) {
          topFunctionWriter().pushRepresentation(i);
          return inst;
        },
        addIntegers() {
          topFunctionWriter().addIntegers();
          return inst;
        },
        subtractIntegers() {
          topFunctionWriter().subtractIntegers();
          return inst;
        },
        multiplyIntegers() {
          topFunctionWriter().multiplyIntegers();
          return inst;
        },
        loadInteger: (offset: number) => {
          topFunctionWriter().loadInteger(offset);
          return inst;
        },
        storeInteger: (offset: number) => {
          topFunctionWriter().storeInteger(offset);
          return inst;
        },
        forPrintMethod(fn: (cwp: PrintCodeWriter) => void): CodeWriter {
          topFunctionWriter().forPrintMethod(fn);
          return inst;
        },
        askString() {
          topFunctionWriter().askString();
          return inst;
        },
        askInteger() {
          topFunctionWriter().askInteger();
          return inst;
        },
        makeCompilerFromCode: () =>
          WasmCompiler.makeWithEntryImplementation(mFunctionWriters[0].toFunctionBody()),
        drop() {
          topFunctionWriter().drop();
          return inst;
        },
        pushFunctionIndex(definer: (codeWriter: CodeWriter) => void): CodeWriter {
          const toPush = mFunctionWriters.length;
          const writer = WasmFunctionCodeWriter.make();
          mFunctionWriters.push(writer);
          mWriterStack.push(writer);
          definer(inst);
          mWriterStack.pop();
          if (mWriterStack.length > 0) {
            topFunctionWriter().pushRepresentation(toPush);
          }
          return inst;
        },
        indirectCall(n: number) {
          topFunctionWriter().indirectCall(n);
          return inst;
        }
      });
      return inst;
    }
  });
})();
