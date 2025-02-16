import { Helpers } from '../helpers';
import { WasmCompiler } from './wasm_compiler';
import { WasmFunctionCodeWriter } from './wasm_function_code_writer';
import { type CodeWriter } from '../code_writer';
import { WasmFunctionBody } from './wasm_function_body';
import { ObjectType } from '../object_type';

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
        askString() {
          topFunctionWriter().askString();
          return inst;
        },
        askInteger() {
          topFunctionWriter().askInteger();
          return inst;
        },
        makeCompilerFromCode: () => {
          const setSpPreface = WasmFunctionBody.make().
            pushI32Const(0).
            pushI32Const(4).
            pushI32Store();
          const firstFBody = mFunctionWriters[0].toFunctionBody();
          setSpPreface.prependCodeTo( firstFBody );
          return WasmCompiler.makeWithEntryImplementation(firstFBody);
        },
        drop() {
          topFunctionWriter().drop();
          return inst;
        },
        printInteger() {
          topFunctionWriter().printInteger();
          return inst;
        },
        printString() {
          topFunctionWriter().printString();
          return inst;
        },
        pushFunctionIndex(_0: ObjectType, definer: (codeWriter: CodeWriter) => void): CodeWriter {
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
