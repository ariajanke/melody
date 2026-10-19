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

import { AstInitializerNode, AstNode } from '../../ast_node';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import {
  CodeEmission,
  ConstantEntity,
  FunctionLookUpTable,
  FunctionType,
  ImmediateFunction,
  ImmediateValue,
  ObjectType,
  RuntimeOnlyValue
} from '../../melody_components';
import { NodeTypeInference } from '../node_type_inference';
import { AttributesCreation } from './attributes_creation';
import { InitializerVariable, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { ContextShift, ContextShiftAssociations, ContextShiftTask, ContextTaskAdditions, DeferredEmissionTask, NodeEntitySet } from './task_controller';
import { VariableAllocation } from './variable_allocation';
import { VariableTypeBreakdownBuild } from './variable_type_breakdown_build';

const { freeze, memoize } = Helpers;

// interface AnythingIWant {
//   entityOf(node: AstNode): ConstantEntity;
// };

function makeRuntimeDeclaration() {
  // must spawn emission task
  
}

const additionalLookUps =
  memoize((): Readonly<[string, FunctionLookUpTable][]> => []);

function makeDeclarationShift
  (mContext: ObjectType,
   mInitializer: AstInitializerNode,
  //  mInitializer: InitializerVariable,
  //  mVarMap: OrderedInitialSetsCollection['variableNameMap'],
   mFactory: ContextTaskAdditions,
   mNodeEntities: NodeEntitySet
  ): ContextShift
{
  // a declaration maybe:
  // - immediate value suitable (build as immediate)
  // - a set of runtime constant (build as emission task)
  // - a totally modifiable set of variables (build as emission task)

  // on nodes generally
  // any node may hide any number tasks
  //
  // consider the order in which we create our initial set of
  // (context related) tasks
  // Task order priorty:
  // - inner defs before outer defs
  // - declarations before defs
  // - code emissions done *only* on a call site which needs that function
  // AST nodes as we know are generally mappable to the set of a
  // specific set of components (each node as an entity).

  // I need value node's... function type? immediate value?
  mNodeEntities.entityOf(mInitializer.valueNode).get('immediate-value');
  mNodeEntities.entityOf(mInitializer.valueNode).get('object-type');
  mInitializer.typeNode;
  const mNameThings = OrderedInitialSetsCollection.singleOf(mInitializer);
  
  // const dependencies = memoize(() => {});

  // mVarMap()['a']
  
  const mNodeTypeInference = NodeTypeInference.make();
  const { typesBreakdown, initializerType, error } = VariableTypeBreakdownBuild.
    make(mContext, mNameThings.initializer(), mNodeTypeInference);

  const allocations = memoize(() => {
    if (!typesBreakdown())
      { return undefined; }

    return mNameThings.variableNames().
      map((vname: string, idx: number): [string, ObjectType] =>
          [vname, typesBreakdown()![idx]]);
  });

  const initializerPair = memoize((): Readonly<[string, FunctionType]> => {
    // assume emittable for now!
    if (initializerType() === undefined) {
      raise('idk');
    }

    const initializerName = FunctionNamingSchema.mapToInitialSetName(mNameThings.variableNames());
    const initializerFtype = mFactory.makeUnassociated(mContext, initializerType()!);

    return [initializerName, initializerFtype];
  });

  const additionalMethods = memoize((): Readonly<Readonly<[string, FunctionType]>[]> => {
    const rv: Readonly<[string, FunctionType]>[] = [initializerPair()];
    mNameThings.variableNames().forEach((vname: string, idx: number) => {
      // each method set has their own set of code emissions tied to their vname
      const mVariableType =
            typesBreakdown()![idx] ??
            raise('index out of bounds');

      const mFunctionNames = mNameThings.variableNameMap()[vname] ??
        raise(`variable "${vname}" not found`);
      const mAttributesCreation = AttributesCreation.
        make(mContext, vname, mFunctionNames, mVariableType, mFactory);
      const { accessor, modifier, call } = mAttributesCreation;
      if (accessor())
        { rv.push(accessor()!); }
      if (modifier())
        { rv.push(modifier()!); }
      if (call())
        { rv.push(call()!); }
    });
    return rv;
  });
  
  const associations = memoize((): ContextShiftAssociations | undefined => freeze({
    additionalMethods,
    additionalLookUps
  }));

  return freeze({
    associations,
    allocations,
    additions: () => mFactory,
    error
  });
}

function makeTask
  (mInitializer: AstInitializerNode,): ContextShiftTask 
{
  function run(
    context: ObjectType,
    // v this factory must be able to "pre-associate" ftypes with immediates
    additions: ContextTaskAdditions,
    set: NodeEntitySet): ContextShift
  {
    return makeDeclarationShift(context, mInitializer, additions, set);
  }

  return freeze({ run });
}

export const DeclarationShiftTask = freeze({ make: makeTask });
