import { Helpers } from './helpers';

const { memoize, freeze } = Helpers;

export interface StringPoolBuilder {
  append(str: string): number;
  finish(): StringPool;
};

export const StringPoolBuilder = freeze({
  make() {
    const mStrings: string[] = [];
    return freeze({
      append: (str: string): number => {
        const { length } = mStrings;
        mStrings.push(str);
        return length;
      },
      finish: () => StringPool.makeForStrings(() => mStrings)
    });
  }
});

export type StringPool = {
  lookUp(str: string): number | undefined
  reverseLookUp(n: number): string | undefined
  askString(): number
};

export const StringPool = freeze({  
  makeDefault: memoize((): StringPool => {
    return StringPool.makeForStrings(() => ['bees']);
  }),
  makeForStrings(getStrings: () => string[]) {
    const stringsArray = memoize(getStrings);
    const reversePoolLookUp = memoize(() => {
      const revmap = stringsArray().
        map((val: string, idx: number) => ({ [val]: idx }));
      return Object.assign({}, ...revmap) as { [name: string]: number | undefined };
    });
    let mAskRot = 0;
    return freeze({
      lookUp: (str: string) =>
        reversePoolLookUp()[str],
      reverseLookUp: (n: number) =>
        stringsArray()[n],
      askString() {
        const rv = mAskRot;
        mAskRot = (mAskRot + 1) % stringsArray().length;
        return rv;
      }
    });
  }
});
