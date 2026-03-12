import { Helpers, raise } from '../helpers';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmBuiltinImportsCreation } from './wasm_builtin_imports_creation';
import { CodeWriter } from '../code_writer';
import { StackCodeWriter } from './stack_code_writer';

const { freeze } = Helpers;

// this could preface the function: (an initial set)
// <parent> SP (passed as parameter, to be set in memory)
//   storeParentStackPointer()
//   WASM:
//     global.get $gSP
//     local.get $param0
//     i32.store
//     
// <context> SP = (current) SP (local, possibly used for receiver later)
//   forStackPointerOnLocal('saveToLocal')
//   WASM:
//     global.get $gSP
//     local.set $lSP
//
// bump SP up <- but this is important for the next frame
//   pushRepresentation(size of current frame).
//     incrementStackPoint()...?
//   WASM:
//     const.i32 (size of current frame)
//     global.get $gSP
//     i32.add
//     global.set $gSP
// within function call:
//   push receiver (whatever is the relevant context)
//   push arguments
//   (optional call index)
//   direct/indirect call
// bump SP down
//   forStackPointerOnLocal('restoreToGlobal')
//   WASM:
//     local.get $lSP
//     global.set $gSP


export interface WasmFunctionCodeWriter extends CodeWriter {
  toFunctionBody(): WasmFunctionBody;
};

function make
  (mFunctionBody: WasmFunctionBody = WasmFunctionBody.make())
  : WasmFunctionCodeWriter
{
  const getImportFuncIndex = (name: string) => {
    const { descriptions } = WasmBuiltinImportsCreation;
    const desc = descriptions()[name];
    if (!desc) { 
      raise(`"${name}" is mispelled or does not exist`);
    }
    return desc.index;
  };

  const pushFunctionCall = (name: string) => {
    const idx = getImportFuncIndex(name);
    mFunctionBody = mFunctionBody.pushFunctionCall(idx);
    return inst;
  };

  const inst: WasmFunctionCodeWriter = freeze({
    ...StackCodeWriter.make(mFunctionBody, (): CodeWriter => inst),
    duplicateTop() {
      const { kSwapTempLocalIndex } = StackCodeWriter;
      mFunctionBody.
        pushTeeLocal(kSwapTempLocalIndex).
        getLocal(kSwapTempLocalIndex);
      return inst;
    },
    pushRepresentation(i: number) {
      if (i < 0) {
        raise('Negative integers not implemented');
      }
      const asHex = i.toString(16).padStart(8, '0');
      if (asHex.length > 8) {
        raise('Given number is too large');
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
      // magic number!
      if (n !== 0) {
        raise('Other signatures are unimplemented');
      }
      mFunctionBody.callIndirect(n);
      return inst;
    },
  });
  return inst;
}

export const WasmFunctionCodeWriter = freeze({ make });
