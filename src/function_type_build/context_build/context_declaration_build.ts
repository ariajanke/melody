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

import { FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { AstNode } from '../../ast_node';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';
import { MutableFunctionTable } from '../mutable_function_table';
import { AttributesCreation } from './attributes_creation';
import { ContextAttributeFactory } from './context_attribute_factory';
import { InitialSetVariables, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { ProgressiveVariableAllocation, VariableAllocation } from './variable_allocation';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

export interface ContextTypeProgression_ {
  nextUndeferredBuild
    (currentFrameType: ObjectType, node: AstNode)
    : FunctionTypeBuild;
};

export interface ContextDeclarationBuild_ {
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

function make
  (mVariableAllocation: ProgressiveVariableAllocation,
   mDeclarations: Readonly<NameDeclaration[]>,
   mWritableReferenceType: WritableObjectType,
   mProgression: ContextTypeProgression_)
: ContextDeclarationBuild_
{
  type RefAllocPair =
    {
      reference: WritableObjectType;
      allocation: ProgressiveVariableAllocation;
    } | undefined;

  const toFunctionTable = MutableFunctionTable.fromFunctionType;

  const { orderedInitialSets, variableNameMap } = OrderedInitialSetsCollection.
    make(mDeclarations);

  function addAttributesToReference
    (wobj: WritableObjectType,
     v: Readonly<InitialSetVariables>,
     alloc: VariableAllocation
    ): WritableObjectType
  {
    const factory = ContextAttributeFactory.make(wobj);
    const info = alloc.lookUpTuple(v.variableNames);
    if (!info) {
      alloc.lookUpTuple(v.variableNames);
      raise(`Cannot look up variable names '${v.variableNames.join(', ')}', were they added?`);
    }

    const initialSetFtype = factory.buildInitialSetter(info.accessIndex, info.type);
    wobj = wobj.setFunctionLookUp(v.name, toFunctionTable(initialSetFtype));
      
    return v.variableNames.reduce((wobj: WritableObjectType, vname: string) => {
      const { accessor, modifier, call } = AttributesCreation.
        make(wobj, vname, variableNameMap, alloc);

      if (accessor()) {
        wobj = wobj.setFunctionLookUp(...accessor()!);
      }
      if (modifier()) {
        wobj = wobj.setFunctionLookUp(...modifier()!);
      }
      if (call()) {
        wobj = wobj.setFunctionLookUp(...call()!);
      }

      return wobj;
    }, wobj);
  }

  function addVariablesFor
    (varAlloc: ProgressiveVariableAllocation,
     variableNames: Readonly<string[]>,
     initialSetType: ObjectType
    ): ProgressiveVariableAllocation
  {
    return variableNames.reduce((alloc: ProgressiveVariableAllocation, vname: string) => {
      const tupleRank = variableNameMap()[vname]?.tupleRank;
      if (tupleRank !== undefined) {
        const detuplifiedTypes = initialSetType.detuplify() ??
          raise(`Variable name '${vname}' says its a tuple member, but the initial set type is not a tuple.`);
        const varType = detuplifiedTypes[tupleRank] ??
          raise(`Rank ${tupleRank} is out of bounds for type '${initialSetType.name()}'`);
        return alloc.next(vname, varType);
      }
      return alloc.next(vname, initialSetType);
    }, varAlloc);   
  }

  const transformedReferenceAndAllocations = memoize(() =>
    orderedInitialSets().
    reduce((pair: RefAllocPair, v: Readonly<InitialSetVariables>) => {
      if (!pair)
        { return pair; }

      const fbuild = mProgression.nextUndeferredBuild(pair.reference, v.valueNode);
      const ftype = fbuild.functionType() ?? setErrorFn(fbuild.error);
      if (!ftype)
        { return undefined; }

      const initialSetType = ftype.returns();
      pair.allocation = addVariablesFor(mVariableAllocation, v.variableNames, initialSetType);
      pair.reference = addAttributesToReference(mWritableReferenceType, v, pair.allocation);
      return pair;
    },
    {
      reference: mWritableReferenceType,
      allocation: mVariableAllocation
    }));

  const fullVariableAllocation = (): VariableAllocation | undefined =>
    transformedReferenceAndAllocations()?.allocation;

  const referenceType = (): ObjectType | undefined =>
    transformedReferenceAndAllocations()?.reference.peek();

  const aggregateType = memoize((): ObjectType | undefined => {
    if (!fullVariableAllocation())
      { return undefined; }

    referenceType();

    return freeze({
      name: () => 'AggregateContext',
      lookUp: (_0: string | symbol) => undefined,
      detuplify: () => undefined,
      uid: memoize(Symbol),
      sizeInBytes: fullVariableAllocation()!.talliedSizeInBytes,
      sizeInStackItems: fullVariableAllocation()!.talliedSizeInItems
    });
  });

  const { error, setErrorFn } = StandardError.make();

  return freeze({ referenceType, aggregateType, error });
}

export const ContextDeclarationBuild_ = freeze({ make });
