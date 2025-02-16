import { Helpers } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmBuiltinImportsCreation } from './wasm_builtin_imports_creation';
import { MemoryArray } from '../memory_array';

const { freeze } = Helpers;

export const WasmFunctionCodeWriter = (() => {
  return freeze({
    make(mFunctionBody: WasmFunctionBody = WasmFunctionBody.make()) {
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
      function getAddrOnTop(offset: number) {
        if (mFunctionBody.localCount() < 1)
          { mFunctionBody.pushLocal(); }
        // get addr at top of stack
        mFunctionBody.
          pushI32Const( MemoryArray.stackPointerLocation() ).
          pushI32Load().
          pushI32Const(offset).
          pushI32Add();
      }
      const inst = freeze({
        pushRepresentation(i: number) {
          if (i < 0) {
            throw new Error('Negative integers not implemented');
          }
          const asHex = i.toString(16).padStart(8, '0');
          if (asHex.length > 8) {
            throw new Error('Given number is too large');
          }
          mFunctionBody.pushI32Const(i);
          return inst;
        },
        addIntegers() {
          mFunctionBody.pushI32Add();
          return inst;
        },
        subtractIntegers() {
          mFunctionBody.pushI32Subtract();
          return inst;
        },
        multiplyIntegers() {
          mFunctionBody.pushI32Multiply();
          return inst;
        },
        loadInteger: (offset: number) => {
          getAddrOnTop(offset);
          // load the datum
          mFunctionBody.pushI32Load();
          return inst;
        },
        storeInteger: (offset: number) => {
          if (mFunctionBody.localCount() < 1)
            { mFunctionBody.pushLocal(); }
          // hold on to what we want to store
          mFunctionBody.setLocal(0);
          getAddrOnTop(offset);
          mFunctionBody.getLocal(0);
          mFunctionBody.pushI32Store();
          return inst;
        },
        printString: () =>
          pushFunctionCall('printString'),
        printInteger: () =>
          pushFunctionCall('printInteger'),
        askString: () =>
          pushFunctionCall('askString'),
        askInteger: () =>
          pushFunctionCall('askInteger'),
        drop() {
          mFunctionBody.pushDrop();
          return inst;
        },
        toFunctionBody() {
          const rv = mFunctionBody;
          mFunctionBody = WasmFunctionBody.make();
          return rv;
        },
        indirectCall(n: number) {
          if (n !== 0) {
            throw new Error('Other signatures are unimplemented');
          }
          mFunctionBody.callIndirect(n);
        }
      });
      return inst;
    }
  });
})();
export type WasmFunctionCodeWriter = ReturnType<typeof WasmFunctionCodeWriter.make>;
