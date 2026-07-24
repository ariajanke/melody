import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';
import { TupleObjectFactory } from '../tuple_type_factory';
import { AncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';

const { freeze, memoize } = Helpers;

/// The ReceiverResolution tells the current context which receiver ought be
/// used, when the code does not make it explicit.
export const ReceiverResolution_ = freeze({
  make(mUsedAncestorCollection: UsedAncestorCollection,
       mReferenceType: ObjectType,
       mFrameStack: ContextFrameStack
  ) {
    const mReceiverResolutionTable: { [uid: symbol]: FunctionType | undefined } = {};
    const { emptyTuple } = TupleObjectFactory;

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

    const { kNoneName, kContextName, kParentName } = FunctionNamingSchema;
    const addBaseReceivers = () =>
      addToTable(emptyTuple(), kNoneName) && 
      addToTable(mReferenceType, kContextName);

    // NOTE absence is not evidence of an error
    function addParent(): FunctionType | undefined {
      addBaseReceivers();

      const { hasParentGetter } = mUsedAncestorCollection;

      if (hasParentGetter()) {
        const parentInfo = mFrameStack.
          contextForHop(ContextFrameStack.kHopsToParent) ??
          raise('cannot find parent');
        
        return addToTable(parentInfo.referenceType(), kParentName) &&
               addToTable(parentInfo.referenceType(), parentInfo.uniqueName());
        
      }

      return undefined;
    }

    // NOTE absence is not evidence of an error
    const addAncestors = memoize((): FunctionType | undefined =>
      mUsedAncestorCollection.ancestors().reduce((prev: FunctionType | undefined, ancInfo: AncestorInfo) => {
        const accName = FunctionNamingSchema.mapToFringeAccessor(ancInfo.variableName);
        return prev && addToTable(ancInfo.type, accName);
      }, addParent()));

    const mapExpectedToReceiverAccessor = (expectedReceiver: ObjectType) => {
      addAncestors();
      return mReceiverResolutionTable[expectedReceiver.uid()];
    };

    return freeze({ mapExpectedToReceiverAccessor });
  }
});
