import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { CallHandlingStrategies, IncompleteFunctionType } from './function_type';
import { PersistentStack } from './persistent_stack';
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
  lookUpTuple: (objectTypes: Readonly<ObjectType[]>) => ObjectType
}

export const ObjectLookUpTable = (() => {
  const getBuiltinTypes = memoize(() => {
    const function_ = ObjectType.make('Function');
    const { noReceiver } = CallHandlingStrategies;

    const assignFn = IncompleteFunctionType.
      make().
      setCallStrategy( noReceiver ).
      setName(':=').
      setParameters(function_.decomposeAsParameters()).
      setReturns  ([ function_ ]).
      setBuiltin((_0: PersistentStack<number>) => {}).
      finish();

    return freeze({
      Integer: IntegerType.instance(),
      String: StringType.instance(),
      Function: function_.
        setLookUp({
          [':=']: assignFn
        }),
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
    function lookUpTuple(types: Readonly<ObjectType[]>) {
      const tupleType = ObjectType.makeForTuple(types);
      addType(tupleType);
      return tupleType;
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
      lookUpTuple,
      addType
    });
    return inst;
  }

  return freeze({ make });
})();
