import { Helpers, raise } from '../helpers';

const { freeze, memoize } = Helpers;

export type FuncImportDescription = {
  index  : number;
  args   : Readonly<WasmType[]>;
  returns: Readonly<WasmType[]>;
};

const kOpCodes = freeze({
  getLocal    : 0x20,
  setLocal    : 0x21,
  getGlobal   : 0x23,
  setGlobal   : 0x24,
  i32Add      : 0x6A,
  i32Subtract : 0x6B,
  i32Multiply : 0x6C,
  i32Const    : 0x41,
  call        : 0x10,
  i32load     : 0x28,
  i32store    : 0x36,
  drop        : 0x1A,
  indirectCall: 0x11,
  functionEnd : 0x0B,
});

const kTypes = freeze({
  i32: 0x7F,
  func: 0x60
});

export type WasmOpCode = keyof typeof kOpCodes;
export type WasmType   = keyof typeof kTypes;

export const TypesAware = (() => {
  const class_ = freeze({
    opCodes: () => kOpCodes,
    types: memoize(() => freeze(Object.assign(
        {},
        ...(Object.
          keys(kTypes) as WasmType[]).
          map(k => ({ [k]: k }))
      ) as { [type in WasmType]: WasmType })),
    asCodeArray: (types: Readonly<WasmType[]>) =>
      [...WasmHelpers.encodeVaruint32(types.length), ...types.map(class_.asCode)],
    asCode: (str: WasmType) =>
      kTypes[str] ?? (() => {
        throw new Error(`could not map ${str} to a WASM code`);
      })()
  });
  return class_;
})();

const kUnsignedInt32Max =  0xFFFFFFFF;
const kSignedInt32Min   = -0x80000000;
const kSignedInt32Max   =  0x7FFFFFFF;

export const WasmHelpers = freeze({
  makeCounter() {
    let n = 0;
    return () => n++;
  },
  externalKinds: memoize(() => freeze({
    func: 0,
    memory: 2,
  })),
  convertStringToNumbers(str: string) {
    const rv = Array<number>(str.length).
      fill(0).
      map((_0: number, idx: number) => str.charCodeAt(idx));
    rv.forEach((code: number) => {
      if (Number.isNaN(code) || code > 255) {
        throw new Error('Cannot convert string');
      }
    });
    return rv;
  },
  encodeVarsint32(n: number): number[] {
    // const rv: number[] = [];
    // if (n === 0)
    //   return [0];
    // const isNegative = n < 0;
    // while (n !== 0) {
    //   // const kEndBitMask = 128;
    //   const rem  = n % 128;
    //   const next = Math.floor(n / 128);
    //   const useExt = isNegative ? next !== -1 : next !== 0;
    //   const ext  = useExt ? 128 : 0;
    //   rv.push(rem + ext);
    //   n = next;
    // }
    // if (rv.length > 5) {
    //   raise('Too large');
    // }
    // return rv;

    // n = Math.abs(n);
    // const kNegNegativeMask = 0x80000000;
    // if (n === kNegNegativeMask) {
    //   raise('Not supporting min negative integer');
    // }
    // if (n < kSignedInt32Min || n > kSignedInt32Max) {
    //   raise('not a 32 bit signed integer');
    // }
    
    // const negMask = isNegative ? kNegNegativeMask : 0;
    // if (kNegNegativeMask > Number.MAX_SAFE_INTEGER) {
    //   raise('Get better javascript lol');
    // }
    
    // n += negMask;
    // // negatives... leading bit of 1, invert everything else
    // while (n > 0) {
    //   // n = ~n; in a sane language I would just flip like this
    //   const rem  = n % 128;
    //   const next = Math.floor(n / 128);
    //   const ext  = next > 0 ? 128 : 0;

    //   if (rem === 0)
    //     { raise('I failed'); }
    //   rv.push((128 - rem) + ext);
    //   n = next;
    // }

    // return rv;
  },
  encodeVaruint32(n: number): number[] {

    if (n < 0 || n > kUnsignedInt32Max) {
      raise('n must be in in [0 (2^32 - 1)]');
    }
    const rv: number[] = [];
    if (n === 0)
      return [0];
    while (n > 0) {
      const rem  = n % 128;
      const next = Math.floor(n / 128);
      const ext  = next > 0 ? 128 : 0;
      rv.push(rem + ext);
      n = next;
    }
    if (rv.length > 5) {
      throw new Error('Too large');
    }
    return rv;
  }
});

export const FinisherHelpers = freeze({
  make() {
    let mFinalCode: Readonly<number[]> | undefined = undefined;
    return freeze({
      resetFinishedCode() {
        mFinalCode = undefined;
      },
      trackFinished(finisher: () => Readonly<number[]>): Readonly<number[]> {
        return mFinalCode ?? finisher();
      }
    });
  }
});

export type SymFunc = () => symbol;
