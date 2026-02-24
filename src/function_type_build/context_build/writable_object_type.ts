import { FunctionLookUpTable, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { BuiltinTypeBase } from '../builtin_type_base';

const { freeze } = Helpers;

export type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

export interface WritableObjectType extends ObjectType {
  // not sure I can enfore move semantic like handling
  setFunctionLookUp
    (operation: string | symbol, lookUpTbl: FunctionLookUpTable)
    : WritableObjectType;
  peek(): WritableObjectType;
};

function make
  (mTable: FunctionOpLookUp = {},
   mBaseObjectType: ObjectType = BuiltinTypeBase.makeNewWithDefaults())
  : WritableObjectType
{
  function setFunctionLookUp
    (operation: string | symbol, lookUpTbl: FunctionLookUpTable)
    : WritableObjectType
  {
    if (mTable[operation]) {
      raise(`Already used '${String(operation)}'`);
    }

    mTable[operation] = lookUpTbl;
    return inst;
  }

  const { lookUp } = mBaseObjectType;

  const inst = freeze({
    ...mBaseObjectType,
    lookUp(operation: string | symbol): FunctionLookUpTable | undefined
      { return mTable[operation] ?? lookUp(operation); },
    setFunctionLookUp,
    peek() {
      return inst;
    }
  });
  return inst;
}

export const WritableObjectType = freeze({ make });
