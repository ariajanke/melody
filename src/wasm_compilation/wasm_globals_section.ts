import { Helpers } from '../helpers';
import { TypesAware, WasmHelpers } from './wasm_helpers';

const { encodeVaruint32 } = WasmHelpers;
const { freeze, memoize } = Helpers;
const { asCode } = TypesAware;

const kMutable = 1,
      kImmutable = 0,
      kGlobalSectionId = 0x06,
      kStackPointerLocation = 0;

// RETAIN for documentation
void kImmutable;

const { i32Const, functionEnd } = TypesAware.opCodes();

export interface WasmGlobalsSection {
  finish(): Readonly<number[]>;
};

function construct(): WasmGlobalsSection {
  const mCode: number[] = [];
  let mNumberOfGlobals = 0;

  function pushStackPointer(): void {
    // NOTE calls for varsint32 encoding, but 0 -> [0]
    const kInitialStackPointerValue = 0;
    const fcode = [i32Const, kInitialStackPointerValue, functionEnd];
    
    mCode.push(asCode(TypesAware.types().i32), kMutable, ...fcode);
    ++mNumberOfGlobals;
  }
  
  const inst = freeze({
    finish: memoize(() => {
      pushStackPointer();
      const numGlobals = encodeVaruint32(mNumberOfGlobals);
      return [
        kGlobalSectionId,
        ...encodeVaruint32(numGlobals.length + mCode.length),
        ...numGlobals,
        ...mCode
      ];
    })
  });
  return inst;
}

export const WasmGlobalsSection = freeze({
  instance: memoize(construct),
  kStackPointerLocation
});
