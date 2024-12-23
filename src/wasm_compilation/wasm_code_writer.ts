import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmBuiltinImportsCreation } from './wasm_builtin_imports_creation';
import { WasmCompiler } from './wasm_compiler';
import { type CodeWriter } from '../function_type';

const { freeze, expose } = Helpers;

export interface WasmCodeWriter extends CodeWriter {
  makeCompilerFromCode(): WasmCompiler
};

export const WasmCodeWriter = (() => {
  return freeze({
    make(mFunctionBody: WasmFunctionBody = WasmFunctionBody.make()): WasmCodeWriter {
      const getImportFuncIndex = (name: string) => {
        const { descriptions } = WasmBuiltinImportsCreation;
        const desc = descriptions()[name];
        if (!desc) { 
          throw new Error(`"${name}" is mispelled or does not exist`);
        }
        return desc.index;
      };
      const pushFunctionCall = (name: string) => {
        mFunctionBody = mFunctionBody.pushFunctionCall(getImportFuncIndex(name));
        return inst;
      };
      const inst = freeze({
        pushInteger(i: number) {
          if (i < 0) {
            throw new Error('Negative integers not implemented');
          }
          const asHex = i.toString(16).padStart(8, '0');
          if (asHex.length > 8) {
            throw new Error('Given number is too large');
          }
          mFunctionBody = mFunctionBody.pushI32Const(i);
          return inst;
        },
        addIntegers() {
          mFunctionBody = mFunctionBody.pushI32Add();
          return inst;
        },
        subtractIntegers() {
          mFunctionBody = mFunctionBody.pushI32Subtract();
          return inst;
        },
        multiplyIntegers() {
          mFunctionBody = mFunctionBody.pushI32Multiply();
          return inst;
        },
        loadInteger: () => {
          mFunctionBody.pushI32Load();
          return inst;
        },
        storeInteger: () => {
          mFunctionBody.pushI32Store();
          return inst;
        },
        printInteger: () =>
          pushFunctionCall('printInteger'),
        printString: () =>
          pushFunctionCall('printString'),
        askString: () =>
          pushFunctionCall('askString'),
        askInteger: () =>
          pushFunctionCall('askInteger'),
        makeCompilerFromCode: () =>
          WasmCompiler.makeWithEntryImplementation(mFunctionBody),
        swapTopTwo() {
          // throw new Error('unimplemented');
          for (let i = 0; mFunctionBody.localCount() < 2; ++i) {
            mFunctionBody.pushLocal();
          }
          mFunctionBody.
            setLocal(0).
            setLocal(1).
            getLocal(0).
            getLocal(1);
          return inst;
        },
        drop() {
          mFunctionBody.pushDrop();
          return inst;
        }
      });
      return inst;
    }
  });
})();
// export type WasmCodeWriter = ReturnType<typeof WasmCodeWriter.make>;
expose({ WasmCodeWriter });
