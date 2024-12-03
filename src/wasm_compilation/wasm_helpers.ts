import { Helpers } from '../helpers';

const { freeze, memoize } = Helpers;

export type FuncImportDescription = {
  index  : number,
  args   : (() => symbol)[],
  returns: (() => symbol)[]
};

export const SimpleCounter = freeze({
  make: (mIndex = 0) => freeze({
    next: () => mIndex++,
    clone: () => SimpleCounter.make(mIndex)
  })
});

export type SimpleCounter = ReturnType<typeof SimpleCounter.make>;

export const WasmHelpers = freeze({
  makeCounter() {
    let n = 0;
    return () => n++;
  },
  externalKinds: memoize(() => freeze({
    func: 0
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
  encodeVaruint32(n: number): number[] {
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

export type SymFunc = () => symbol;
