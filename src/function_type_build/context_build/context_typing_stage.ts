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

import { BuiltinFunctionNames } from '../../builtin_function_names';
import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionTypeBase } from '../function_type_base';
import { MutableFunctionTable } from '../mutable_function_table';
import { ContextLinkStage_ } from './context_link_stage';
import { FunctionOpLookUp, WritableObjectType } from './writable_object_type';
import { WasmCompilation } from '../../wasm_compilation';
import { SystemIoType } from '../system_io_type';
import { PutsFunctionLookUpTable } from '../puts_function_look_up_table';
import { FunctionLookUpTable, FunctionType, MelodyComponentVisitor, ObjectType } from '../../melody_components';
import { TupleObjectType } from '../tuple_object_type';
import { AstDefinitionNode, AstInitializerNode, AstNode } from '../../ast_node';
import { NodeTypeInference } from '../node_type_inference';
import { NodeTypeEvaluation } from '../node_type_evaluation';
import { InitializerVariable, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { AttributesCreation, AttributesTuple } from './attributes_creation';
import { FunctionTypeAssociationSet } from '../function_type_association_set';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { ContextBaseNamesSet, UsedContextNames } from '../context_base_names_set';

const { freeze, memoize } = Helpers;

interface ContextShiftFactory {
  methodPairs(): Readonly<AttributesTuple[]>;
  associationSet(): FunctionTypeAssociationSet;
  byInitializer(
    initializerType: ObjectType,
    variableNames: Readonly<string[]>,
    variableTypes: Readonly<ObjectType[]>): ContextShiftByInitializer;
};

interface ContextShiftByInitializer {
  appendInitializer(writableContext: WritableObjectType): WritableObjectType;
  appendAttribute(writableContext: WritableObjectType, _1: string, variableIndex: number):
    WritableObjectType;
};

const ContextShiftFactory = freeze({
  make(mVarMap: OrderedInitialSetsCollection['variableNameMap'],
       mAssociations: FunctionTypeAssociationSet = FunctionTypeAssociationSet.make())
    : ContextShiftFactory
  {
    const mAttrs: AttributesTuple[] = [];
    const methodPairs = (): Readonly<AttributesTuple[]> => mAttrs;
    const associationSet = () => mAssociations;
    function byInitializer
      (mInitializerType: ObjectType,
       mVariableNames: Readonly<string[]>,
       mVariableTypes: Readonly<ObjectType[]>): ContextShiftByInitializer
    {
      if (mVariableNames.length !== mVariableTypes.length)
        { raise('name and types size mismatch, syntax error should have been caught earlier'); }

      let mSetInitializer = false;
      function appendInitializer(writableContext: WritableObjectType): WritableObjectType {
        if (mSetInitializer)
          { raise('already set initializer'); }

        const initializerName = FunctionNamingSchema.mapToInitialSetName(mVariableNames);
        const initializerFtype = mAssociations.makeUnassociated(writableContext, mInitializerType);
        mAttrs.push([initializerName, initializerFtype]);
        writableContext.setFunctionType(initializerName, initializerFtype);
        mSetInitializer = true;
        return writableContext;
      }

      function appendAttribute
        (mWritableContext: WritableObjectType,
         _1: string,
         mVariableIndex: number): WritableObjectType
      {
        const mVariableType =
          mVariableTypes[mVariableIndex] ??
          raise('index out of bounds');
        const mVariableName = mVariableNames[mVariableIndex];
        const mFunctionNames = mVarMap()[mVariableName] ??
          raise(`variable "${mVariableName}" not found`);
        const mAttributesCreation = AttributesCreation.
          make(mWritableContext, mVariableName, mFunctionNames, mVariableType, associationSet);
        const { accessor, modifier, call } = mAttributesCreation;

        function onPair(attrFn: () => AttributesTuple | undefined) {
          const attr = attrFn();
          if (!attr)
            { return; }

          mWritableContext.setFunctionType(...attr);
          mAttrs.push(attr);
        }
        
        onPair(accessor);
        onPair(modifier);
        onPair(call);
        return mWritableContext;
      }

      return freeze({ appendAttribute, appendInitializer });
    }

    return freeze({ methodPairs, associationSet, byInitializer });
  }
});

interface VariableTypeBreakdownBuild {
  initializerType(): ObjectType | undefined;
  typesBreakdown(): Readonly<ObjectType[]> | undefined;
  error(): StandardErrorMessage;
};

const VariableTypeBreakdownBuild = freeze({
  make(mCurrentContext: ObjectType,
       mInitializer: InitializerVariable,
       mNodeTypeInference: NodeTypeInference = NodeTypeInference.make(),
       mError: StandardError = StandardError.make()): VariableTypeBreakdownBuild
  {
    const { setErrorFn, setErrorMessage, error } = mError;
    const { variableNames } = mInitializer;

    const initializerType_ = memoize((): ObjectType | undefined => {
      if (mInitializer.typeNode) {
        const { objectType, error } = NodeTypeEvaluation.
          make(mInitializer.valueNode);
        return objectType() ?? setErrorFn(error);
      }

      const trt = mNodeTypeInference.
        useFor(mCurrentContext).
        representationFor(mInitializer.valueNode);
      return trt.resultantType() ?? setErrorFn(trt.error);
    });

    const typesBreakdown = memoize((): Readonly<ObjectType[]> | undefined => {
      if (!initializerType_())
        { return undefined; }

      if (variableNames.length === 1)
        { return [initializerType_()!]; }

      const detuped = initializerType_()!.detuplify();
      if (!detuped) {
        return setErrorMessage('initializer type is not a tuple');
      }

      if (variableNames.length !== detuped.length) {
        return setErrorMessage('number of names do not match number of types');
      }

      return detuped;
    });

    return freeze({
      initializerType: (): ObjectType | undefined =>
        typesBreakdown() && initializerType_(),
      typesBreakdown,
      error
    });
  }
});

interface Thing {
  // enable access to used ancestors collection for each child of a given node
  addFullyNamedContext(
    node: AstDefinitionNode,
    uniqueName: string,
    fullyNamedContext: ObjectType): Thing;
  // access must be enabled, or this will raise!
  // if a def node has any pending names, attempt to get this
  // in the root case, simply fail to retrieve and allow methods to be left
  // undefined (therefore allowing future error handling to catch undefines)
  usedAncestorsCollectionFor(node: AstDefinitionNode): UsedAncestorCollection;
};

function makeThing
  (mContextNamesFor: (node: AstDefinitionNode) => UsedContextNames): Thing
{
  function addFullyNamedContext(
    node: AstDefinitionNode,
    uniqueName: string,
    fullyNamedContext: ObjectType): void
  {
    // referenceType, uniqueName
    mContextNamesFor(node);
  }

  function usedAncestorsCollectionFor
    (node: AstDefinitionNode): UsedAncestorCollection
  {

  }
}

function doStuff(mRoot: AstDefinitionNode) {
  const { contextNamesFor, baseStageFor } = ContextBaseNamesSet.make(mRoot);
  const { addFullyNamedContext, usedAncestorsCollectionFor } = makeThing(contextNamesFor);
  (node: AstDefinitionNode) => {
    const cns = contextNamesFor(node);
    const baseStage = baseStageFor(node);
    // basestage into
    const wr = baseStage.referenceType() as WritableObjectType;
    const uac = usedAncestorsCollectionFor(node);
    make(cns, wr, uac);
    
  }
}

function make
  (mContextNames: UsedContextNames,
    // mPendingNames: { [name: string]: true },
   
   mWritableReferenceType: WritableObjectType,
   mUsedAncestors: UsedAncestorCollection
  //  mDeclarations: Readonly<AstInitializerNode[]>
  )
{
  // still need linking and delegations
  // linking -> I don't think we need anything here yet?
  // delegations -> make it "we just need them" kind of deal
  const mError = StandardError.make();
  const { declarations, pendingNames } = mContextNames;
  const { error, setErrorFn } = mError;
  const mNodeTypeInference = NodeTypeInference.make();

  Object.keys(pendingNames());

  const mOrderedInitializers =
    OrderedInitialSetsCollection.make(declarations());

  const mFactory = ContextShiftFactory.make(mOrderedInitializers.variableNameMap);
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
    reduce(reduceInitializerVariable, mWritableReferenceType));
  const { methodPairs, associationSet } = mFactory;
  const pendingForEmission = methodPairs;
}