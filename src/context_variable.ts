import { Helpers } from './helpers';
import { ObjectLookUpTable } from './object_look_up_table';
import { ObjectType } from './object_type';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';

const { freeze, registerSymbolStrings } = Helpers;

type StorableValue = number | string | AstFunctionDefinitionNode;

export interface ContextVariable {
  type: () => ObjectType
  set: (v: StorableValue) => ContextVariable,
  copyTo: (cv: ContextVariable) => void,
  asString: () => string,
  asNumber: () => number,
  setType: (objType: ObjectType) => ContextVariable
}

export const ContextVariable = (() => {
  const cannotConvertToNumber =(_0: StorableValue): number =>
    { throw new Error('not a number'); };
  const kStringAccessors = freeze({
    asString_: (s: StorableValue): string => s as string,
    asNumber: cannotConvertToNumber
  });

  const kNumericAccessors = freeze({
    asString_: (s: StorableValue): string => `${s}`,
    asNumber: (s: StorableValue): number => s as number
  });

  const kFunctionAccessors = freeze({
    asString_: (_0: StorableValue): string => '<function>',
    asNumber : cannotConvertToNumber
  });

  const kUninitializedAccessors = (() => {
    const kNotInitializedError = <Type>(_0: StorableValue): Type => {
      throw new Error(`not initialized`);
    };
    return freeze({
      asString_: kNotInitializedError<string>,
      asNumber : kNotInitializedError<number>
    });
  })();

  const kTypes = freeze({
    integer  : Symbol(),
    string   : Symbol(),
    function_: Symbol()
  });

  registerSymbolStrings('ContextVariable', kTypes);

  function make(mValue?: StorableValue): ContextVariable {
    const { getBuiltinTypes } = ObjectLookUpTable;
    const kBuiltinTypes = getBuiltinTypes();
    const inst = freeze({ set, asString, asNumber, type, copyTo, setType });

    let mType = kBuiltinTypes.Unresolved;
    let mAsString = kUninitializedAccessors.asString_;
    let mAsNumber = kUninitializedAccessors.asNumber;

    function set(v: StorableValue): ContextVariable {
      const accessors = (() => {
        if (typeof v === 'number') {
          mType = kBuiltinTypes.Integer;
          return kNumericAccessors;
        } else if (typeof v === 'string') {
          mType = kBuiltinTypes.String;
          return kStringAccessors;
        } else if (typeof v === 'object') {
          mType = kBuiltinTypes.Function;
          return kFunctionAccessors;
        } else {
          throw Error(`Cannot handle type "${typeof v}`);
        }
      })();
      mValue = v;
      mAsString = accessors.asString_;
      mAsNumber = accessors.asNumber;
      return inst;
    }

    function setType(objType: ObjectType) {
      switch (objType.uid) {
      case kBuiltinTypes.Integer.uid:
        mType = kBuiltinTypes.Integer;
        break;
      case kBuiltinTypes.String .uid:
        mType = kBuiltinTypes.String;
        break;
      case kBuiltinTypes.Function.uid:
        mType = kBuiltinTypes.Function
        break;
      default:
        throw Error(`Cannot set to type "${objType.name()}"`);
      }
      return inst;
    }

    function copyTo(cv: ContextVariable): void {
      if (typeof mValue === 'undefined') {
        throw Error('Cannot copy uninitialized context variable');
      }
      cv.set(mValue);
    }

    function asString(): string
      { return mAsString(mValue as StorableValue); }

    function asNumber(): number
      { return mAsNumber(mValue as StorableValue); }

    function type(): ObjectType { return mType; }

    return mValue ? set(mValue) : inst;
  }

  return freeze({ make, types: kTypes });
})();
