import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { TupleObjectType } from '../tuple_object_type';
import { AncestorInfo } from './ancestor_collection';
import { UsedAncestorCollection } from './used_ancestor_collection';

const { freeze, memoize } = Helpers;

/// Identifies how to get a receiver needed by a function call, typically
/// within the context of a function's stack frame.
export interface ReceiverResolution_ {
  /// For some given object type representing a receiver, find an ftype that 
  /// can be called (which takes a "Tuple()" receiver) to retrieve that
  /// receiver.
  mapExpectedToReceiverAccessor:
    (expectedReceiver: ObjectType) =>
    // will always have "Tuple()" as the expected receiver
    // returning undefined would mean here: can't identify proper receiver error
    FunctionType | undefined;
};

function make
  (mUsedAncestorCollection: UsedAncestorCollection,
   mReferenceType: ObjectType)
  : ReceiverResolution_
{
  const mReceiverResolutionTable: { [uid: symbol]: FunctionType | undefined } = {};
  const { emptyTuple } = TupleObjectType;
  const { kNoneName, kContextName, kParentName } = FunctionNamingSchema;

  function addToTable(receiverType: ObjectType, name: string): FunctionType {
    const ftype = mReferenceType.
      lookUp(name)?.
      byParameters(emptyTuple());
    if (!ftype) {
      raise(`Failed lookup of "${name}", was not added to stack frame's type`);
    } else if (ftype.receiver().uid() !== emptyTuple().uid()) {
      raise('All receiver accessors must have "Tuple()" as the expected receiver');
    }
    return mReceiverResolutionTable[receiverType.uid()] = ftype;
  }

  // NOTE absence is not evidence of an error
  function addParent(): FunctionType | undefined {
    addToTable(emptyTuple(), kNoneName);
    addToTable(mReferenceType, kContextName);
    
    const parentInfo = mUsedAncestorCollection.parent();

    if (parentInfo) {
      const { type, variableName } = parentInfo;
      const accessorName = FunctionNamingSchema.
        mapToFringeAccessor(variableName);
      
      return addToTable(type, kParentName) &&
             addToTable(type, accessorName);
    }

    return undefined;
  }

  // NOTE absence is not evidence of an error
  const addAncestors = memoize((): FunctionType | undefined =>
    mUsedAncestorCollection.
    ancestors().
    reduce((prev: FunctionType | undefined, ancInfo: AncestorInfo) => {
      const accName = FunctionNamingSchema.mapToFringeAccessor(ancInfo.variableName);
      return prev && addToTable(ancInfo.type, accName);
    }, addParent()));

  function mapExpectedToReceiverAccessor
    (expectedReceiver: ObjectType): FunctionType | undefined
  {
    addAncestors();
    
    return mReceiverResolutionTable[expectedReceiver.uid()];
  };

  return freeze({ mapExpectedToReceiverAccessor });
}

/// The ReceiverResolution tells the current context which receiver ought be
/// used, when the code does not make it explicit.
export const ReceiverResolution_ = freeze({ make });
