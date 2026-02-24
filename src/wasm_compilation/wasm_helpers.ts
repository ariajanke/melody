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
  teeLocal    : 0x22,
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

export const TypesAware = freeze({
  opCodes: () => kOpCodes,
  types: memoize(() => freeze(Object.assign(
      {},
      ...(Object.
        keys(kTypes) as WasmType[]).
        map(k => ({ [k]: k }))
    ) as { [type in WasmType]: WasmType })),
  asCodeArray: (types: Readonly<WasmType[]>): Readonly<number[]> =>
    [...WasmHelpers.encodeVaruint32(types.length), ...types.map(TypesAware.asCode)],
  asCode: (str: WasmType): number =>
    kTypes[str] ?? raise(`could not map ${str} to a WASM code`)
});

const kUnsignedInt32Max =  0xFFFFFFFF;
const kSignedInt32Min   = -0x80000000;
const kSignedInt32Max   =  0x7FFFFFFF;

if (kUnsignedInt32Max > Number.MAX_SAFE_INTEGER) {
  raise('Get better javascript lol');
}

export const WasmHelpers = freeze({
  makeCounter(): () => number {
    let n = 0;
    return (): number => n++;
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
    if (n < kSignedInt32Min || n > kSignedInt32Max)
      { raise('not a 32 bit signed integer'); }

    if (n < 0) {
      n = kUnsignedInt32Max - Math.abs(n);
    }
    const gv = WasmHelpers.encodeVaruint32(n);
    // NOTE if the seventh bit is set, we must extend the rv by one more byte so
    //      WASM doesn't interpret it as a negative number
    if (gv[gv.length - 1] > 0b00111111) {
      gv[gv.length - 1] += 0b10000000;
      gv.push(0);
    }
    return gv;
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
