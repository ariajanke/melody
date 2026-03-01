import { ContextTypeReservations } from '../context_type_reservations';
import { ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
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

const { kParentAccessIndex, kReservedBytesForParent } = ContextTypeReservations;
const kStartingByteOffset = kReservedBytesForParent;
const kStartingItemCount = kStartingByteOffset / kReservedBytesForParent;

export const VariableTracker = freeze({
  make() {
    let mByteOffset = kStartingByteOffset;
    let mItemCount = kStartingItemCount;
    const mVarTable: { [name: string]: VarTypeInfo | undefined } = {};
    const { kContextToken } = Token;

    function ensureVariablePresence
      (name: string, objectType: ObjectType): VarTypeInfo
    {
      const info = mVarTable[name];
      if (info && info.type.uid() !== objectType.uid()) {
        // throw new Error(`Type mismatch between "${info.type.name()}" ` +
        //                 `and "${objectType.name()}"`);
        raise(`Type mismatch between "${info.type.name()}" ` +
              `and "${objectType.name()}"`);
      }
      if (info)
        { return info; }

      if (name === kContextToken.content()) {
        raise(`this name is reserved for context access`);
      }

      // test me: <context> does not increase size
      // why does this break the compiler?
      // const isContext = name === kContextToken.content();
      // const accessIndex = isContext ? 0 : mByteOffset;
      const accessIndex = mByteOffset;
      // if (!isContext) {
        mByteOffset += objectType.sizeInBytes();
        mItemCount += objectType.sizeInStackItems();
      // }

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
