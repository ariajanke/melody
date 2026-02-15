import { Helpers } from '../helpers';
import {
  FinisherHelpers,
  TypesAware,
  WasmHelpers,
  WasmType,
} from './wasm_helpers';
import { TypeSignatureTracker } from './type_signature_tracker';

const { freeze } = Helpers;
const { asCode, asCodeArray } = TypesAware;

const kTypesSectionCode = 0x1;

function make() {
  const mCode: number[] = [];
  let mTypeCount = 0;
  const mTypeSignatureTracker = TypeSignatureTracker.make();

  const { func } = TypesAware.types();
  const { encodeVaruint32 } = WasmHelpers;
  const { resetFinishedCode, trackFinished } = FinisherHelpers.make();
      
  const inst = freeze({
    // NOTE
    // TypeScript limitation, no way to make a set of constants into their
    // type additionally without having all numeric operations/methods
    // defined. (verify?) 
    pushFunction(arguments_: Readonly<WasmType[]>, returns: Readonly<WasmType[]>) {
      // have to exclude known types?
      resetFinishedCode();
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

      return inst;
    },
    indexFor: mTypeSignatureTracker.indexFor,
    typeCount: () => mTypeCount,
    finish() {
      return trackFinished(() => {
        const typeCount = encodeVaruint32(mTypeCount);
        const sectionSize = encodeVaruint32(mCode.length + typeCount.length);
        const rv = [
          kTypesSectionCode,
          ...sectionSize,
          ...typeCount,
          ...mCode
        ];
        return rv;
      });
    }
  });
  return inst;
}

export const WasmTypesSection = freeze({ make });
export type WasmTypesSection = ReturnType<typeof WasmTypesSection.make>;
