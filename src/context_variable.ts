import { Helpers } from './helpers';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';

const { freeze, registerSymbolStrings } = Helpers;

export interface ContextVariable {
  type: () => ObjectType
  set: (v: number | string) => ContextVariable,
  copyTo: (cv: ContextVariable) => void,
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

  const kUninitializedAccessors = (() => {
    const kNotInitializedError = <Type>(_0: string | number): Type => {
      throw Error(`not initialized`);
    };
    return freeze({
      asString_: kNotInitializedError<string>,
      asNumber : kNotInitializedError<number>
    });
  })();

  const kTypes = freeze({
    integer: Symbol(),
    string : Symbol()
  });

  registerSymbolStrings('ContextVariable', kTypes);

  function make(mValue?: number | string): ContextVariable {
    const { getBuiltinTypes } = ObjectLookUpTable;
    const kBuiltinTypes = getBuiltinTypes();
    const inst = freeze({ set, asString, asNumber, type, copyTo });

    let mType = kBuiltinTypes.Unresolved;
    let mAsString = kUninitializedAccessors.asString_;
    let mAsNumber = kUninitializedAccessors.asNumber;

    function set(v: number | string): ContextVariable {
      const accessors = (() => {
        if (typeof v === 'number') {
          mType = kBuiltinTypes.Integer;
          return kNumericAccessors;
        } else if (typeof v === 'string') {
          mType = kBuiltinTypes.String;
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

    function copyTo(cv: ContextVariable): void {
      if (typeof mValue === 'undefined') {
        throw Error('Cannot copy uninitialized context variable');
      }
      cv.set(mValue);
    }

    function asString(): string
      { return mAsString(mValue as string | number); }

    function asNumber(): number
      { return mAsNumber(mValue as string | number); }

    function type(): ObjectType { return mType; }

    return mValue ? set(mValue) : inst;
  }

  return freeze({ make, types: kTypes });
})();
