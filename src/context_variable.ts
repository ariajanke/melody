import { Helpers } from './helpers';

const { freeze, registerSymbolStrings } = Helpers;

export interface ContextVariable {
  type: () => symbol
  set: (v: number | string) => ContextVariable,
  asString: () => string,
  asNumber: () => number
}

export const ContextVariable = (() => {
  const kStringAccessors = freeze({
    asString_: (s: string | number): string => s as string,
    asNumber: (_0: string | number): number => {
      throw Error('not a number');
    }
  });

  const kNumericAccessors = freeze({
    asString_: (s: string | number): string => `${s}`,
    asNumber: (s: string | number): number => s as number
  });

  const kUninitializedAccessors = freeze({
    asString_: (_0: string | number): string => {
      throw Error(`not initialized`)
    },
    asNumber: kStringAccessors.asNumber,
  });

  const kTypes = freeze({
    integer: Symbol(),
    string: Symbol()
  });

  registerSymbolStrings('ContextVariable', kTypes);

  function make(mValue: number | string): ContextVariable {
    const inst = freeze({ set, asString, asNumber, type });

    let mType = Symbol();
    let mAsString = kUninitializedAccessors.asString_;
    let mAsNumber = kUninitializedAccessors.asNumber;

    function set(v: number | string): ContextVariable {
      const accessors = (() => {
        if (typeof v === 'number') {
          mType = kTypes.integer;
          return kNumericAccessors;
        } else if (typeof v === 'string') {
          mType = kTypes.string;
          return kStringAccessors
        } else {
          throw Error(`Cannot handle type "${typeof v}`);
        }
      })();
      mValue = v;
      mAsString = accessors.asString_;
      mAsNumber = accessors.asNumber;
      return inst;
    }

    function asString(): string
      { return mAsString(mValue); }

    function asNumber(): number
      { return mAsNumber(mValue); }

    function type(): symbol { return mType; }

    return set(mValue);
  }

  return freeze({ make, types: kTypes });
})();
