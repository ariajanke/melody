import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

export interface MutableFunctionTable extends FunctionLookUpTable {
  setDefinition(parameterType: ObjectType, ft: FunctionType): MutableFunctionTable;
};

export const MutableFunctionTable = freeze({
  make(): MutableFunctionTable {
    const mMappings: { [uid: symbol]: FunctionType | undefined } = {};
    const inst = freeze({
      setDefinition(forType: ObjectType, ft: FunctionType) {
        const uid = forType.uid();
        if (mMappings[uid]) {
          throw new Error(`Parameter type "${forType.name()}" already taken`);
        }
        mMappings[uid] = ft;
        return inst;
      },
      byParameters: (type: ObjectType) => mMappings[type.uid()]
    });
    return inst;
  }
});
