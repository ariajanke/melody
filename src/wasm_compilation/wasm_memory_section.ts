import { Helpers } from '../helpers';
import { FinisherHelpers, WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

function construct() {
  const { encodeVaruint32 } = WasmHelpers;
  const { trackFinished } = FinisherHelpers.make();

  const inst = freeze({
    finish() {
      return trackFinished(() => {
        return [
          0x05,
          3, // section size
          1, // count of memory descriptions
          0x0, // no flags -> no maximum
          ...encodeVaruint32(16) // number of pages
        ];
      });
    }
  });
  return inst;
}

export const WasmMemorySection = freeze({ make: construct });
export type  WasmMemorySection = ReturnType<typeof construct>;
