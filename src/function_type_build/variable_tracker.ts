import { ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { Token } from '../token';

const { freeze } = Helpers;

export interface VarTypeInfo {
  type: ObjectType;
  accessIndex: number;
};

export interface VariableTracker {
  ensureVariablePresence(name: string, objectType: ObjectType): VarTypeInfo;
  talliedSizeInBytes(): number;
  talliedSizeInItems(): number;
};

export const VariableTracker = freeze({
  make() {
    let mByteOffset = 0;
    let mItemCount = 0;
    const mVarTable: { [name: string]: VarTypeInfo | undefined } = {};
    const { kContextToken } = Token;

    function ensureVariablePresence
      (name: string, objectType: ObjectType): VarTypeInfo
    {
      const info = mVarTable[name];
      if (info && info.type.uid() !== objectType.uid()) {
        throw new Error(`Type mismatch between "${info.type.name()}" ` +
                        `and "${objectType.name()}"`);
      }
      if (info)
        { return info; }

      // test me: <context> does not increase size
      // why does this break the compiler?
      const isContext = name === kContextToken.content();
      const accessIndex = isContext ? 0 : mByteOffset;
      if (!isContext) {
        mByteOffset += objectType.sizeInBytes();
        mItemCount += objectType.sizeInStackItems();
      }

      return (mVarTable[name] = {
        type: objectType,
        accessIndex
      });
    }

    return freeze({
      ensureVariablePresence,
      talliedSizeInBytes: () => mByteOffset,
      talliedSizeInItems: () => mItemCount
    });
  }
});
