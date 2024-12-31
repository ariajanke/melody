
import { Helpers } from './helpers';
import { FunctionType } from './function_type';
import { FunctionLookUpTable, IncompleteFunctionLookUpTable } from './function_look_up_table';
import { ObjectType } from './object_type';

const { freeze, memoize } = Helpers;

type LookUpLookUpTable = { [name: string]: FunctionLookUpTable };

export interface WritableObjectType {
  setName: (name: string) => WritableObjectType,
  setToIntegerSize(): WritableObjectType,
  pushFunctionTypeByName: (name: string, func: FunctionType) => WritableObjectType
  pushFunctionTableByName: (name: string, funcTable: FunctionLookUpTable) =>
    WritableObjectType
  pushFunctionTypes: (types: { [name: string]: FunctionType }) => WritableObjectType
  pushFunctionTables: (tables: LookUpLookUpTable) => WritableObjectType
  acceptMerge: (fn: (currentOffset: number) => ObjectType) => WritableObjectType,
  objectType: () => ObjectType
}

export const WritableObjectType = freeze({
  make() {
    let mName = '<anonymous>';
    let mPosition = 0;
    let mSize = 0;
    const mLookupTable: LookUpLookUpTable = {};

    function acceptMerge(fn: (currentOffset: number) => ObjectType): WritableObjectType {
      const objType = fn(mPosition);
      mPosition += objType.sizeInBytes();
      objType.forEachName((name: string, table: FunctionLookUpTable) => {
        mLookupTable[name] = table;
      });
      return inst;
    }

    function setName(name: string): WritableObjectType {
      mName = name;
      return inst;
    }

    function pushFunctionTypeByName(name: string, func: FunctionType): WritableObjectType {
      mLookupTable[name] = IncompleteFunctionLookUpTable.
        make().push(func).finish();
      return inst;
    }

    function pushFunctionTableByName(name: string, funcTable: FunctionLookUpTable):
      WritableObjectType
    {
      mLookupTable[name] = funcTable;
      return inst;
    }

    function pushFunctionTypes(types: { [name: string]: FunctionType }): WritableObjectType {
      Object.keys(types).forEach((name: string) => {
        inst.pushFunctionTypeByName(name, types[name]);
      });
      return inst;
    }

    function pushFunctionTables(tables: LookUpLookUpTable): WritableObjectType {
      Object.keys(tables).forEach((name: string) => {
        inst.pushFunctionTableByName(name, tables[name]);
      });
      return inst;
    }

    function setToIntegerSize() {
      mSize = 4;
      return inst;
    }

    function objectType(): ObjectType {
      return ObjectType.make(mName, mSize, mLookupTable);
    }

    const inst = freeze({
      acceptMerge,
      setName,
      pushFunctionTableByName,
      pushFunctionTypeByName,
      pushFunctionTypes,
      pushFunctionTables,
      objectType: memoize(objectType),
      setToIntegerSize
    });
    return inst;
  }
});
