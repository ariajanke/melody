// import { DastDeclarationMap } from '../../dast_build';
import { FunctionType, ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';
import { ContextAncestorAccessorsStage } from './context_ancestor_accessors_stage';
import { WritableObjectType } from './writable_object_type';
import { ContextDeclarationBuild_, ContextTypeProgression_ } from './context_declaration_build';
import { ContextDelegationStage_ } from './context_delegation_stage';
import { FunctionBodyPrefaceBuild } from './function_body_preface_build';
import { ReceiverResolution_ } from './receiver_resolution';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { ProgressiveVariableAllocation, VariableAllocation } from './variable_allocation';
import { AncestorCollection, AncestorInfo } from './ancestor_collection';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';

const { freeze, memoize } = Helpers;

export type DeclarationBuildConstructor =
  (declarations: Readonly<NameDeclaration[]>,
   incompleteContextType: WritableObjectType,
   progression: ContextTypeProgression_) =>
  ContextDeclarationBuild_;

export interface ContextLinkStage_ {
  preface(): FunctionType;
  receiverResolution(): ReceiverResolution_;
  next(declarations: Readonly<NameDeclaration[]>,
       progression: ContextTypeProgression_)
      : ContextDeclarationBuild_;
};

function make
  (mPendingNames: Readonly<{ [name: string]: true }>,
   mFrameStack: ContextFrameStack,
   mWritableReferenceType: WritableObjectType)
: ContextLinkStage_
{
  const mAncestorCollection = AncestorCollection.make(mFrameStack);
  return makeWithAncestors(mPendingNames, mAncestorCollection, mWritableReferenceType);
}

function makeWithAncestors
  (mPendingNames: Readonly<{ [name: string]: true }>,
   mAncestorCollection: AncestorCollection,
   mWritableReferenceType: WritableObjectType)
: ContextLinkStage_
{
  const mUsedAncestorCollection: UsedAncestorCollection =
    UsedAncestorCollection.make(mAncestorCollection, mPendingNames);
  const makeInitialAllocation = () => {
    const parent = mUsedAncestorCollection.parent();
    if (!parent)
      { return VariableAllocation.make(); }

    return VariableAllocation.make(parent.variableName, parent.type);
  };

  const variableAllocation = memoize((): ProgressiveVariableAllocation =>
    mUsedAncestorCollection.
      ancestors().
      reduce((varAlc: ProgressiveVariableAllocation, anc: AncestorInfo) =>
              varAlc.next(anc.variableName, anc.type),
             makeInitialAllocation()));

  const accessorsStage = memoize(() => ContextAncestorAccessorsStage.
    make(variableAllocation(),
         mUsedAncestorCollection,
         mWritableReferenceType));

  const delegationStage = memoize(() =>
    preface() && ContextDelegationStage_.
      make(mPendingNames,
           mUsedAncestorCollection,
           writableReferenceType(),
           makeDeclarationBuild));

  const writableReferenceType = () => accessorsStage().writableReferenceType();

  const referenceType = writableReferenceType as () => ObjectType;

  const prefaceBuild = memoize(() =>
    FunctionBodyPrefaceBuild.
      make(variableAllocation(),
           mUsedAncestorCollection,
           referenceType()));

  function makeDeclarationBuild
    (declarations: Readonly<NameDeclaration[]>,
     incompleteContextType: WritableObjectType,
     progression: ContextTypeProgression_)
  {
    return ContextDeclarationBuild_.
      make(variableAllocation(),
           declarations,
           incompleteContextType,
           progression);
  }

  const receiverResolution = memoize(() =>
    ReceiverResolution_.make(mUsedAncestorCollection, referenceType()));

  const preface = memoize(() => prefaceBuild().functionType());

  function next
    (declarations: Readonly<NameDeclaration[]>,
     progression: ContextTypeProgression_)
    : ContextDeclarationBuild_
  {
    return delegationStage().next(declarations, progression);
  }

  return freeze({
    receiverResolution,
    preface,
    next
  });
}

export const ContextLinkStage_ = freeze({
  make,
  testing: { makeWithAncestors }
});
