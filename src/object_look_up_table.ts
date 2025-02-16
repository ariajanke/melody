import { Helpers } from './helpers';
import { ObjectType } from './object_type';
import { FunctionType } from './function_type';
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
  temporarilyDefineType<Type>(obj: ObjectType, fn: () => Type): Type
}

export const ObjectLookUpTable = (() => {
  const getBuiltinTypes = memoize(() => {
    
    return freeze({
      Integer: IntegerType.instance(),
      String: StringType.instance(),
      Function: FunctionType.asAnObjectType(),
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

    function temporarilyDefineType<Type>(obj: ObjectType, fn: () => Type): Type {
      const oldByName = mLookUpByName[obj.name()];
      inst.addType(obj);
      const rv = fn();
      mLookUpByName[obj.name()] = oldByName;
      mLookUpByUid[obj.uid()] = undefined;
      return rv;
    }

    const inst = freeze({
      addBuiltinTypes,
      lookUpByType,
      lookUpByName,
      addType,
      temporarilyDefineType
    });
    return inst;
  }

  return freeze({ make });
})();
