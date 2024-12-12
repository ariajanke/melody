import { Helpers } from '../helpers';
import { type SymFunc, TypesAware, WasmHelpers } from './wasm_helpers';
import { TypeSignatureTracker } from './type_signature_tracker';

const { freeze, expose } = Helpers;

export const WasmTypesSection = (() => {
  const { wasmTypes, asCode, asCodeArray } = TypesAware;

  const class_ = freeze({
    wasmTypes,
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
              push(asCode(func),
                  ...asCodeArray(arguments_),
                  ...asCodeArray(returns));
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
