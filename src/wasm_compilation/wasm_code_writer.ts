import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmBuiltinImportsCreation } from './wasm_builtin_imports_creation';
import { WasmCompiler } from './wasm_compiler';

const { freeze, expose } = Helpers;

export const WasmCodeWriter = (() => {
  return freeze({
    make(mFunctionBody: WasmFunctionBody = WasmFunctionBody.make())
    {
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
        printInteger: () =>
          pushFunctionCall('printInteger'),
        printString: () =>
          pushFunctionCall('printString'),
        askString: () =>
          pushFunctionCall('askString'),
        askInteger: () =>
          pushFunctionCall('askInteger'),
        makeCompilerFromCode: () =>
          WasmCompiler.makeWithEntryImplementation(mFunctionBody)
      });
      return inst;
    }
  });
})();
export type WasmCodeWriter = ReturnType<typeof WasmCodeWriter.make>;
expose({ WasmCodeWriter });
