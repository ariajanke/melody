import { ContextTypeReservations } from '../context_type_reservations';
import { FunctionNamingSchema } from '../function_naming_schema';
import { ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';

const { freeze } = Helpers;

interface WritableVarTypeInfo {
  type: ObjectType;
  accessIndex: number;
};

export type VarTypeInfo = Readonly<WritableVarTypeInfo>;

export interface VariableTracker {
  ensureVariablePresence(name: string, objectType: ObjectType): VarTypeInfo;
  talliedSizeInBytes(): number;
  talliedSizeInItems(): number;
};

const { kParentAccessIndex, kReservedBytesForParent } = ContextTypeReservations;

export const VariableTracker = freeze({
  make(): VariableTracker {
    let mByteOffset = 0;
    let mItemCount = 0;
    const mVarTable: { [name: string]: WritableVarTypeInfo | undefined } = {};

    function handleAddingParent(objectType: ObjectType): VarTypeInfo {
      if (mVarTable[FunctionNamingSchema.kParentName])
        { raise('already have parent?!'); }

      // NOTE all other variables have to be bumped
      //      if there's a parent, that first slot must be for that parent
      for (const name in mVarTable) {
        mVarTable[name]!.accessIndex += kReservedBytesForParent;
      }

      return (mVarTable[FunctionNamingSchema.kParentName] = {
        type: objectType,
        accessIndex: kParentAccessIndex
      });
    }

    function ensureVariablePresence
      (name: string, objectType: ObjectType): VarTypeInfo
    {
      const info = mVarTable[name];
      if (info && info.type.uid() !== objectType.uid()) {
        raise(`Type mismatch between "${info.type.name()}" ` +
              `and "${objectType.name()}"`);
      }
      if (info)
        { return info; }

      if (name === FunctionNamingSchema.kContextName) {
        raise(`this name is reserved for context access`);
      }

      const accessIndex = mByteOffset;
      mByteOffset += objectType.sizeInBytes();
      mItemCount += objectType.sizeInStackItems();
      if (name === FunctionNamingSchema.kParentName) {
        return handleAddingParent(objectType);
      }

      return (mVarTable[name] = { type: objectType, accessIndex });
    }

    return freeze({
      ensureVariablePresence,
      talliedSizeInBytes: () => mByteOffset,
      talliedSizeInItems: () => mItemCount
    });
  }
});
