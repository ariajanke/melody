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

import { ObjectType } from '../../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { MutableFunctionTable } from '../mutable_function_table';
import { AttributesCreation } from './attributes_creation';
import { ContextAttributeFactory } from './context_attribute_factory';
import { InitializerVariable, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { ProgressiveVariableAllocation, VariableAllocation } from './variable_allocation';
import { WritableObjectType } from './writable_object_type';
import { NodeTypeInference } from '../node_type_inference';
import { NodeTypeEvaluation } from '../node_type_evaluation';
import { AstInitializerExpression } from '../../ast_node';

const { freeze, memoize } = Helpers;

export interface ContextDeclarationBuild_ {
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

type RefAllocPair =
  {
    reference: WritableObjectType;
    allocation: ProgressiveVariableAllocation;
  } | undefined;

function make
  (mVariableAllocation: ProgressiveVariableAllocation,
   mDeclarations: Readonly<AstInitializerExpression[]>,
   mWritableReferenceType: WritableObjectType)
: ContextDeclarationBuild_
{
  const toFunctionTable = MutableFunctionTable.fromFunctionType;

  const { orderedInitialSets, variableNameMap } = OrderedInitialSetsCollection.
    make(mDeclarations);

  function addAttributesToReference
    (wobj: WritableObjectType,
     v: Readonly<InitializerVariable>,
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

  const mNodeTypeInference = NodeTypeInference.make();

  function initialSetTypeOf
    (ctxRef: ObjectType,
     varInfo: Readonly<InitializerVariable>): ObjectType | undefined
  {
    const { valueNode, typeNode } = varInfo;
    if (valueNode) {
      const trt = mNodeTypeInference.useFor(ctxRef).representationFor(valueNode);
      return trt.resultantType() ?? setErrorFn(trt.error);
    }

    if (typeNode) {
      const { objectType, error } = NodeTypeEvaluation.make(typeNode);
      return objectType() ?? setErrorFn(error);
    }

    return setErrorMessage(`Context method set "${varInfo.name}" must have a value or type`);
  }

  const transformedReferenceAndAllocations = memoize(() =>
    orderedInitialSets().
    reduce((pair: RefAllocPair, v: Readonly<InitializerVariable>) => {
      if (!pair)
        { return pair; }

      const initialSetType = initialSetTypeOf(pair.reference, v);
      if (!initialSetType)
        { return undefined; }

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

  const { error, setErrorFn, setErrorMessage } = StandardError.make();

  return freeze({ referenceType, aggregateType, error });
}

export const ContextDeclarationBuild_ = freeze({ make });
