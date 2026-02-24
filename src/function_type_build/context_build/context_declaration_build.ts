import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { MutableFunctionTable } from '../mutable_function_table';
import { AttributesCreation } from './attributes_creation';
import { ContextAttributeFactory } from './context_attribute_factory';
import { InitialSetVariables, OrderedInitialSetsCollection } from './ordered_initial_sets_collection';
import { ProgressiveVariableAllocation, VariableAllocation } from './variable_allocation';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

export interface ContextTypeProgression_ {
  nextUndeferredBuild
    (currentFrameType: ObjectType, node: DastNode)
    : FunctionTypeBuild;
};

export interface ContextDeclarationBuild_ {
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

function make
  (mVariableAllocation: ProgressiveVariableAllocation,
   mDeclarationsMap: DastDeclarationMap,
   mWritableReferenceType: WritableObjectType,
   mProgression: ContextTypeProgression_
  )
: ContextDeclarationBuild_
{
  type RefAllocPair =
    {
      reference: WritableObjectType;
      allocation: ProgressiveVariableAllocation;
    } | undefined;

  const toFunctionTable = MutableFunctionTable.fromFunctionType;

  const { orderedInitialSets, variableNameMap } = OrderedInitialSetsCollection.
    make(mDeclarationsMap, (fname: string) => !!mWritableReferenceType.lookUp(fname));

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

      // CRITICAL SECTION
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
