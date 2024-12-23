import { Helpers } from './helpers';
import { ObjectType, WritableObjectType } from './object_type';
import {
  CallHandlingStrategies,
  CallingContext,
  CodeWriter,
  IncompleteFunctionType
} from './function_type';
import { ObjectTypeResolution } from './object_type_resolution';
import { StandardErrorMessage } from './helpers';
import { IntegerType } from './integer_type';
import { StringType } from './string_type';

const { freeze, memoize } = Helpers;

export interface ObjectLookUpTable {
  addBuiltinTypes: () => ObjectLookUpTable,
  addType: (obj: ObjectType) => ObjectLookUpTable,
  // usefulness???
  lookUpByType: (type: ObjectType) => ObjectTypeResolution,
  lookUpByName: (name: string) => ObjectTypeResolution,
}

export const ObjectLookUpTable = (() => {
  const getBuiltinTypes = memoize(() => {
    const mutable_function_type = WritableObjectType.make().setName('Function');
    const function_ = mutable_function_type.objectType();
    const { noReceiver } = CallHandlingStrategies;

    mutable_function_type.pushFunctionTypeByName(':=', IncompleteFunctionType.
      make().
      setCallStrategy( noReceiver ).
      setName(':=').
      setParameters(function_).
      setReturns  ( function_ ).
      setBuiltin((_0: CallingContext, _1: CodeWriter) => {}).
      finish());

    return freeze({
      Integer: IntegerType.instance(),
      String: StringType.instance(),
      Function: function_,
      Unresolved: ObjectType.make('Unresolved')
    });
  });

  function make(): ObjectLookUpTable {
    const mLookUpByUid: { [uid: symbol]: ObjectTypeResolution | undefined } = {};
    const mLookUpByName: { [name: string]: ObjectTypeResolution | undefined } = {};

    function addBuiltinTypes(): ObjectLookUpTable {
      const { Integer, String, Function } = getBuiltinTypes();
      [ Integer, String , Function ].forEach(addType);
      return inst;
    }

    function lookUpByName(name: string): ObjectTypeResolution {
      const res = mLookUpByName[name];
      if (res)
        { return res; }
      return freeze({
        resolve: () => undefined,
        error: memoize((): StandardErrorMessage => freeze({
          message: `Cannot find type by name "${name}"`
        }))
      });
    }

    function lookUpByType(type: ObjectType): ObjectTypeResolution {
      const res = mLookUpByUid[type.uid()];
      if (res)
        { return res; }
      return freeze({
        resolve: () => undefined,
        error: memoize((): StandardErrorMessage => freeze({
          message: 'Cannot find type by given type uid'
        }))
      });
    }

    function addType(objType: ObjectType): ObjectLookUpTable {
      const res = ObjectTypeResolution.makeFixedForType(objType);
      mLookUpByName[objType.name()] = res;
      mLookUpByUid [objType.uid() ] = res;
      return inst;
    }

    const inst = freeze({
      addBuiltinTypes,
      lookUpByType,
      lookUpByName,
      addType
    });
    return inst;
  }

  return freeze({ make });
})();
