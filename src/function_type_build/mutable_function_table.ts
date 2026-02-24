import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

export interface MutableFunctionTable extends FunctionLookUpTable {
  setDefinition(ft: FunctionType): MutableFunctionTable;
};

function make(): MutableFunctionTable {
  const mMappings: { [uid: symbol]: FunctionType | undefined } = {};
  let mCount = 0;
  let mUnique: FunctionType | undefined = undefined;

  function setDefinition(ft: FunctionType): MutableFunctionTable {
    const uid = ft.parameters().uid();
    if (mMappings[uid]) {
      raise(`Parameter type "${ft.parameters().name()}" already taken`);
    }
    mMappings[uid] = ft;
    ++mCount;
    if (mCount === 1) {
      mUnique = ft;
    } else {
      mUnique = undefined;
    }
    return inst;
  }

  const inst = freeze({
    setDefinition,
    uniqueFunctionType: (): FunctionType | undefined => mUnique,
    byParameters: (type: ObjectType) => mMappings[type.uid()]
  });
  return inst;
}

function fromFunctionType(ftype: FunctionType): FunctionLookUpTable {
  return freeze({
    byParameters: (type: ObjectType) => (type.uid() == ftype.parameters().uid()) ? ftype : undefined,
    uniqueFunctionType: (): FunctionType | undefined => ftype
  });
}

const emitEmptyTuple = memoize((): FunctionLookUpTable =>
  fromFunctionType(FunctionTypeBase.emitEmptyTuple()));

export const MutableFunctionTable = freeze({
  make,
  fromFunctionType,
  emitEmptyTuple
});
