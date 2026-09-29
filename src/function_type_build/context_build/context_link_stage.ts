/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { FunctionType, ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';
import { ContextAncestorAccessorsStage } from './context_ancestor_accessors_stage';
import { WritableObjectType } from './writable_object_type';
import { ContextDeclarationBuild_ } from './context_declaration_build';
import { ContextDelegationStage_ } from './context_delegation_stage';
import { FunctionBodyPrefaceBuild } from './function_body_preface_build';
import { ReceiverResolution_ } from './receiver_resolution';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { ProgressiveVariableAllocation, VariableAllocation } from './variable_allocation';
import { AncestorCollection, AncestorInfo } from './ancestor_collection';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';
import { ParametersTypeRetrieval } from '../parameters_type_build';
import { ContextParameterStage_ } from './context_parameter_stage';

const { freeze, memoize } = Helpers;

export type DeclarationBuildConstructor =
  (declarations: Readonly<NameDeclaration[]>,
   incompleteContextType: WritableObjectType) =>
  ContextDeclarationBuild_;

export interface ContextLinkStage_ {
  preface(): FunctionType;
  receiverResolution(): ReceiverResolution_;
  next(parametersRetrieval: ParametersTypeRetrieval): ContextParameterStage_;
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

  const roVariableAllocation = variableAllocation as () => VariableAllocation;

  const accessorsStage = memoize(() => ContextAncestorAccessorsStage.
    make(roVariableAllocation(),
         mUsedAncestorCollection,
         mWritableReferenceType));

  const delegationStage = memoize(() =>
    preface() && ContextDelegationStage_.
      make(mPendingNames,
           mUsedAncestorCollection,
           writableReferenceType()));

  const writableReferenceType = () => accessorsStage().writableReferenceType();

  const referenceType = writableReferenceType as () => ObjectType;

  const prefaceBuild = memoize(() =>
    FunctionBodyPrefaceBuild.
      make(roVariableAllocation(),
           mUsedAncestorCollection,
           referenceType()));

  const receiverResolution = memoize(() =>
    ReceiverResolution_.make(mUsedAncestorCollection, referenceType()));

  const preface = memoize(() => prefaceBuild().functionType());

  function next(parametersRetrieval: ParametersTypeRetrieval): ContextParameterStage_ {
    return ContextParameterStage_.
      make(delegationStage().writableReferenceType(),
           parametersRetrieval,
           variableAllocation());
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
