import { Helpers } from '../helpers';
import { type SymFunc, WasmHelpers } from './wasm_helpers';
import { TypeSignatureTracker } from './type_signature_tracker';

const { freeze, memoize, expose } = Helpers;

export const WasmTypesSection = (() => {
  const getRepresentations = memoize(() => {
    const { i32, func } = class_.wasmTypes();
    return freeze({
      [func()]: 0x60,
      [i32 ()]: 0x7F
    });
  });
  
  const lookUp = (keyFn: SymFunc) =>
    getRepresentations()[keyFn()] ??
    (() => { throw new Error('must use wasmTypes defined symbols'); })();
  
  const class_ = freeze({
    wasmTypes: memoize(() => freeze({
      i32 : memoize(Symbol), //0x7F,
      func: memoize(Symbol)  //0x60
    })),
    make(mCode: number[] = [],
         mTypeCount = 0,
         mTypeSignatureTracker = TypeSignatureTracker.make())
    {
      const { func } = class_.wasmTypes();
      const { encodeVaruint32 } = WasmHelpers;
      
      const inst = freeze({
        // NOTE
        // TypeScript limitation, no way to make a set of constants into their
        // type additionally without having all numeric operations/methods
        // defined. (verify?) 
        pushFunction(arguments_: SymFunc[], returns: SymFunc[]) {
          // have to exclude known types?
          if (arguments_.length > 255 || returns.length > 255) {
            throw new Error('Too many arguments for WASM');
          }
          if (mTypeSignatureTracker.indexFor(arguments_, returns) === undefined) {
            mCode.
              push(lookUp(func),
                  ...encodeVaruint32(arguments_.length),
                  ...arguments_.map((fn: SymFunc) => lookUp(fn)),
                  ...encodeVaruint32(returns.length),
                  ...returns.map((fn: SymFunc) => lookUp(fn)));
            mTypeSignatureTracker.makeIndexFor(arguments_, returns);
            ++mTypeCount;
          }
          const rv = class_.make(mCode, mTypeCount, mTypeSignatureTracker);
          mCode = [];
          return rv;
        },
        indexFor: mTypeSignatureTracker.indexFor,
        typeCount: () => mTypeCount,
        finish() {
          const typeCount = encodeVaruint32(mTypeCount);
          const sectionSize = encodeVaruint32(mCode.length + typeCount.length);
          const rv = [
            1, // section code
            ...sectionSize,
            ...typeCount,
            ...mCode
          ];
          mCode.length = 0;
          return rv;
        }
      });
      return inst;
    }
  });
  return class_;
})();
export type WasmTypesSection = ReturnType<typeof WasmTypesSection.make>;
expose({ WasmTypesSection });
