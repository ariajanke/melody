import { Helpers } from '../helpers';
import { WasmHelpers } from './wasm_helpers';

const { freeze } = Helpers;

export const WasmFunctionBody = (() => {
  const kOpCodes = freeze({
    getLocal   : 0x20,
    i32Add     : 0x6A,
    i32Subtract: 0x6B,
    i32Multiply: 0x6C,
    i32Const   : 0x41,
    call       : 0x10
  });
  const kFunctionEnd = 0x0B;
  
  const class_ = freeze({
    make(mCode: number[] = []) {
      const { encodeVaruint32 } = WasmHelpers;
      const pushSingleInstruction = (instr: number) => {
        const newCode = [
          ...mCode,
          instr
        ];
        const rv = class_.make(newCode);
        mCode.length = 0;
        return rv;
      };
      return freeze({
        pushI32Const(constant: number) {
          if (constant < 0 || constant > 2000000000) {
            throw new Error(`Value ${constant} not supported for i32 const`);
          }
          mCode = [
            ...mCode,
            0x41,
            ...encodeVaruint32(constant)
          ];
          const rv = class_.make(mCode);
          mCode = [];
          return rv;
        },
        pushI32Add: () => pushSingleInstruction(kOpCodes.i32Add),
        pushI32Subtract: () => pushSingleInstruction(kOpCodes.i32Subtract),
        pushI32Multiply: () => pushSingleInstruction(kOpCodes.i32Multiply),
        pushFunctionCall(funcIdx: number) {
          mCode = [
            ...mCode,
            kOpCodes.call,
            ...encodeVaruint32(funcIdx)
          ];
          const rv = class_.make(mCode);
          mCode = [];
          return rv;
        },
        finish() {
          mCode.push(kFunctionEnd);
          // must begin with local decl count
          mCode = [...encodeVaruint32(0), ...mCode];
          const rv = [
            ...encodeVaruint32(mCode.length),
            ...mCode
          ];
          mCode = [];
          return rv;
        }
      });
    }
  });
  return class_;
})();
export type WasmFunctionBody = ReturnType<typeof WasmFunctionBody.make>;
