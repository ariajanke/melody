import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { ContextDeclarationBuild, ContextDelegationStage, ContextLinkStage, ReceiverResolution } from '../context_build';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionOpLookUp } from './context_base_stage';
import { ContextDeclarationBuild_ } from './context_declaration_build';
import { ContextDelegationStage_ } from './context_delegation_stage';
import { FunctionBodyPrefaceBuild } from './function_body_preface_build';
import { ReceiverResolution_ } from './receiver_resolution';
import { AncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';
import { VariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface ContextLinkStage_ {
  preface(): FunctionType;
  receiverResolution(): ReceiverResolution;
  next(): ContextDelegationStage;
};

export const ContextLinkStage_ = freeze({
  make(mPendingNames: Readonly<{ [name: string]: true }>,
       mFrameStack: ContextFrameStack,
       mReferenceType: ObjectType,
       mReferenceTypeLookUpTable: FunctionOpLookUp = {}
  ): ContextLinkStage
  {
    const mUsedAncestorCollection = UsedAncestorCollection.
      make(mFrameStack, mPendingNames);
    const { hasParentGetter } = mUsedAncestorCollection;
    const receiverResolution = memoize(() =>
      ReceiverResolution_.make(mUsedAncestorCollection, mReferenceType, mFrameStack));

    const variableAllocation = memoize((): VariableAllocation => {
      if (!hasParentGetter())
        { return VariableAllocation.make(); }

      const parentContextSnapshot = mFrameStack.
        contextForHop(ContextFrameStack.kHopsToParent);
      if (!parentContextSnapshot) {
        raise('Used ancestor collection contains direct parent for an empty ' +
              'context stack.');
      }

      const varAlc = VariableAllocation.
        make(FunctionNamingSchema.kParentName,
             parentContextSnapshot.referenceType());
      return mUsedAncestorCollection.
        ancestors().
        reduce((varAlc: VariableAllocation, anc: AncestorInfo) =>
                varAlc.next(anc.variableName, anc.type), varAlc);
    });

    const prefaceBuild = FunctionBodyPrefaceBuild.
      make(variableAllocation(), mUsedAncestorCollection, mReferenceType, mReferenceTypeLookUpTable);

    const preface = memoize(() =>
      prefaceBuild.addAncestorAccessors() && prefaceBuild.functionType());

    const buildDeclarationThings =
      (mDeclarationsMap: DastDeclarationMap,
        mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild
    ): ContextDeclarationBuild => {
      return ContextDeclarationBuild_.
        make(variableAllocation(),
              mReferenceTypeLookUpTable,
              mDeclarationsMap,
              mIntoFunctionTypeBuild,
              mReferenceType);
    };

    const next =
      (): ContextDelegationStage =>
    {        
      return preface() && ContextDelegationStage_.
        make(mPendingNames,
              mReferenceTypeLookUpTable,
              mFrameStack,
              mReferenceType,
              buildDeclarationThings);
    };

    return freeze({
      receiverResolution,
      preface,
      next
    });
  }
});
