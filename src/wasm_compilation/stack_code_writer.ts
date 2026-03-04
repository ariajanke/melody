import { Helpers } from '../helpers';
import { CodeWriter } from '../code_writer';
import { WasmFunctionBody } from './wasm_function_body';
import { WasmGlobalsSection } from './wasm_globals_section';
// import { ContextTypeReservations } from '../context_type_reservations';

const { memoize, freeze, makeCounter } = Helpers;

const counter = makeCounter();
const kParentPointerParamIndex = counter();
const kParameterCount = kParentPointerParamIndex + 1;
const kSwapLocalIndex = counter();
const kStackPointerLocalIndex = counter();
const kLocalsCount = counter();

function make
  (mFunctionBody: WasmFunctionBody,
   mGetWriter: () => CodeWriter) 
{
  const stackPointerLocation = memoize(() => WasmGlobalsSection.kStackPointerLocation);
  // const { kParentAccessIndex } = ContextTypeReservations;

  const ensureLocalsPresent = memoize(() => {
    while (mFunctionBody.localCount() < (kLocalsCount - kParameterCount)) {
      mFunctionBody = mFunctionBody.pushLocal();
    }
  });

  function pushSpPlusOffset(offset: number) {
    mFunctionBody.
      getLocal(kStackPointerLocalIndex).
      pushI32Const(offset).
      pushI32Add();
  }

  function loadInteger(offset: number) {
    pushSpPlusOffset(offset);
    mFunctionBody.pushI32Load();
    return mGetWriter();
  };

  function storeInteger(offset: number) {
    // if (offset === kParentAccessIndex) {
    //   raise(`Offset ${kParentAccessIndex} is reserved for storing the parent frame stack pointer`);
    // }
    ensureLocalsPresent();

    mFunctionBody.setLocal(kSwapLocalIndex);
    // now datum in local, stack is "empty" of store stuff
    pushSpPlusOffset(offset);
    // now correct address on top
    mFunctionBody.
      getLocal(kSwapLocalIndex).
      // now datum on top, then address, good ready!
      pushI32Store();
    return mGetWriter();
  }

  function forStackPointer(option: 'saveToLocal' | 'restoreToGlobal') {
    ensureLocalsPresent();
    if (option === 'saveToLocal') {
      mFunctionBody.
        getGlobal(stackPointerLocation()).
        setLocal(kStackPointerLocalIndex);
    } else {
      mFunctionBody.
        getLocal(kStackPointerLocalIndex).
        setGlobal(stackPointerLocation());
    }
    return mGetWriter();
  }

  function storeParentStackPointer() {
    ensureLocalsPresent();
    mFunctionBody.
      getGlobal(stackPointerLocation()).
      getLocal(kParentPointerParamIndex).
      pushI32Store();
    return mGetWriter();
  }

  function incrementStackPointer() {
    mFunctionBody.
      getGlobal(stackPointerLocation()).
      pushI32Add().
      setGlobal(stackPointerLocation());
    return mGetWriter();
  }

  function pushStackPointer() {
    mFunctionBody.getLocal(kParentPointerParamIndex);
    return mGetWriter();
  }

  const inst = freeze({
    loadInteger,
    storeInteger,
    forStackPointer,
    storeParentStackPointer,
    incrementStackPointer,
    pushStackPointer
  });
  return inst;
}

export const StackCodeWriter = freeze({ make, kLocalsCount });