import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze, memoize } = Helpers;

const kMemorySectionId = 0x05;
const kPagesofMemory = 16;

export interface WasmMemorySection {
  finish(): Readonly<number[]>;
}

function construct(): WasmMemorySection {
  const { encodeVaruint32 } = WasmHelpers;
  const { trackFinished } = FinisherHelpers.make();

  const inst = freeze({
    finish() {
      return trackFinished(() => {
        return [
          kMemorySectionId,
          3  , // section size
          1  , // count of memory descriptions
          0x0, // no flags -> no maximum
          ...encodeVaruint32(kPagesofMemory)
        ];
      });
    }
  });
  return inst;
}

export const WasmMemorySection = freeze({ instance: memoize(construct) });
