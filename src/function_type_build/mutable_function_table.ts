import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';

const { freeze } = Helpers;

export interface MutableFunctionTable extends FunctionLookUpTable {
  setDefinition(parameterType: ObjectType, ft: FunctionType)
    : MutableFunctionTable;
};

function make(): MutableFunctionTable {
  const mMappings: { [uid: symbol]: FunctionType | undefined } = {};
  let mDirty = false;
  const mCompleteList: FunctionType[] = [];

  function setDefinition(forType: ObjectType, ft: FunctionType) {
    mDirty = true;
    const uid = forType.uid();
    if (mMappings[uid]) {
      raise(`Parameter type "${forType.name()}" already taken`);
    }
    mMappings[uid] = ft;
    return inst;
  }

  function list() {
    if (!mDirty)
      { return mCompleteList; }

    mCompleteList.length = 0;
    Object.
      getOwnPropertySymbols(mMappings).
      forEach((uid: symbol) =>
        mCompleteList.push(mMappings[uid]!));
    mDirty = false;
    
    return mCompleteList;
  }
  const inst = freeze({
    setDefinition,
    list,
    byParameters: (type: ObjectType) => mMappings[type.uid()]
  });
  return inst;
}

export const MutableFunctionTable = freeze({ make });
