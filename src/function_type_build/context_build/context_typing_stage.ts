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

import { Helpers, StandardError } from '../../helpers';
import { ContextLinkStage_ } from './context_link_stage';
import { WritableObjectType } from './writable_object_type';
import { ObjectType } from '../../melody_components';
import { NodeTypeInference } from '../node_type_inference';
import { InitializerVariable, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { FunctionTypeAssociationSet } from '../function_type_association_set';
import { ExtendedAncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';
import { UsedContextNames } from '../context_names_tree_set';
import { VariableTypeBreakdownBuild } from './variable_type_breakdown_build';
import { ContextShiftFactory } from './context_shift_factory';
import { AncestorInfo } from './ancestor_collection';
import { TupleObjectType } from '../tuple_object_type';

// this is perhaps better thought up as a "naming" stage
// not all types ought need be known yet, only "enough" (at least ideally)
//
// though we're *still* not fully naming everything in the frame
// there's a key omission: ancestor accessors!
export interface ContextTypingStage_ {
  referenceType(): ObjectType;
  linkingStage(): ContextLinkStage_;
};

const { freeze, memoize } = Helpers;

// What can we get away with not knowing?
// With that answer, we need to reduce this service to that as much as possible.
// 
function make
  (mContextNames: UsedContextNames,
   mWritableReferenceType: WritableObjectType,
   mUsedAncestors: UsedAncestorCollection,
   mAssociations: FunctionTypeAssociationSet = FunctionTypeAssociationSet.make())
  : ContextTypingStage_
{
  // I still need parameter naming too! (ow)
  // can't throw away uac until emission is complete for the entire body (yuck)
  // still need linking and delegations
  // linking -> I don't think we need anything here yet?
  // delegations -> make it "we just need them" kind of deal
  const mError = StandardError.make();
  const { declarations, pendingNames } = mContextNames;
  const { error, setErrorFn } = mError;
  const mNodeTypeInference = NodeTypeInference.make();

  const ancestoredContextType = (() => {
    mUsedAncestors.ancestors().forEach((anc: AncestorInfo) => {
      mAssociations.makeUnassociated(undefined, undefined, anc.type);
    });
  });

  const delegatedContextType = ((): WritableObjectType =>
    Object.keys(pendingNames()).reduce((context: WritableObjectType, pendingName: string) => {
      const ftbl = mUsedAncestors.mapNameToAncestor(pendingName)?.lookUp(pendingName);
      if (!ftbl) {
        // NOTE if a method cannot be delegated, leave it undefined
        //      if the call is still missing, we will later generate the
        //      appropriate missing method error
        return context;
      }
      
      return context.setFunctionLookUp(pendingName, ftbl);
    }, mWritableReferenceType));

  const mOrderedInitializers =
    OrderedInitialSetsCollection.make(declarations());

  const mFactory = ContextShiftFactory.make(mOrderedInitializers.variableNameMap, mAssociations);
  function reduceInitializerVariable
    (inprogressContextType: WritableObjectType | undefined,
     initializer: InitializerVariable): WritableObjectType | undefined
  {
    if (!inprogressContextType)
      { return undefined; }

    const { typesBreakdown, initializerType, error } = VariableTypeBreakdownBuild.
      make(inprogressContextType, initializer, mNodeTypeInference, mError);

    if (!typesBreakdown())
      { return setErrorFn(error); }

    const { appendAttribute, appendInitializer } = mFactory.
      byInitializer(initializerType()!, initializer.variableNames, typesBreakdown()!);

    return initializer.variableNames.
      reduce(appendAttribute, appendInitializer(inprogressContextType));
  }

  const writableReferenceType = memoize((): WritableObjectType | undefined =>
    mOrderedInitializers.
    orderedInitialSets().
    reduce(reduceInitializerVariable, delegatedContextType()));
  const { methodPairs, associationSet } = mFactory;
  const pendingForEmission = methodPairs;

  // need a map:
  // fnames -> [vnames, init type]
  //           ?attribute vname
  // ancestors:
  // accessors to inhabit above fnames
  // pass UAC to emission?

  const { allAncestorsOrdered, ancestors, parent } = mUsedAncestors;

  return freeze({
    writableReferenceType,
    associationSet, // <- for furthering component associations 
    pendingForEmission, // <- our pending variable info
    // v ancestors or preface
    someAncestorInfo: { allAncestorsOrdered, ancestors, parent },
    error
  });
}

export const ContextTypingStage_ = freeze({ make });
