import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { FunctionOpLookUp } from './context_base_stage';
import { DeclarationFunctionGroup, NameTypePair } from './declaration_function_group';
import { DeclarationLookUpTable } from './declaration_look_up_table';
import { ImplicitCallCollection, NameLookUpPair } from './implicit_calls_collection';
import { OrderedDeclarationsGroupCollection } from './ordered_declaration_groups_collection';
import { VariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface ContextDeclarationBuild_ {
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  cachedBuildFor(node: DastNode): FunctionTypeBuild | undefined;
  error(): StandardErrorMessage;
};

function make
  (mVariableAllocation: VariableAllocation,
   mReferenceTypeLookUpTable: FunctionOpLookUp,
   mDeclarationsMap: DastDeclarationMap,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mReferenceType: ObjectType)
: ContextDeclarationBuild_
{
  const mOrderedDeclarations = OrderedDeclarationsGroupCollection.
    make(mDeclarationsMap, mIntoFunctionTypeBuild);

  const { orderedGroups } = mOrderedDeclarations;

  const fullVariableAllocation = memoize(() =>
    orderedGroups().
    reduce((startingAlloc: VariableAllocation | undefined, t: DeclarationFunctionGroup) => {
      if (!startingAlloc)
        { return undefined; }

      // NOTE higly state dependant, build the base value node first,
      //      variable and function types will depend on it
      const { functionType, error } = t.baseValueFunctionBuild();
      
      if (!functionType()) {
        return setErrorFn(error)
      }

      const newAlloc = t.variableBreakdown().
        reduce((prev: VariableAllocation, cur: NameTypePair) => {
          return prev.next(cur.name, cur.type);
        }, startingAlloc);

      // NOTE we must add functions as they maybe depended upon in future base
      //      value builds
      t.functionNames().forEach((name: string) => {
        mReferenceTypeLookUpTable[name] = DeclarationLookUpTable.
          make(mDeclarationsMap[name], newAlloc);
      });

      ImplicitCallCollection.
        make(mReferenceType, t.variableBreakdown()).
        collection().
        forEach((v: NameLookUpPair) => {
          mReferenceTypeLookUpTable[v.name] = v.lookUpTable;
        });

      return newAlloc;
    }, mVariableAllocation));

  const referenceType = memoize((): ObjectType | undefined => {
    if (!fullVariableAllocation())
      { return undefined; }

    return mReferenceType;
  });

  const aggregateType = memoize((): ObjectType | undefined => {
    if (!fullVariableAllocation())
      { return undefined; }

    return freeze({
      name: () => 'AggregateContext',
      lookUp: (_0: string | symbol) => undefined,
      detuplify: () => undefined,
      uid: memoize(Symbol),
      sizeInBytes: fullVariableAllocation()!.talliedSizeInBytes,
      sizeInStackItems: fullVariableAllocation()!.talliedSizeInItems
    });
  });

  const cachedBuildFor = (node: DastNode) => {
    if (!referenceType())
      { return undefined; }
    return mOrderedDeclarations.cachedBuildFor(node);
  };

  const { error, setErrorFn } = StandardError.make();

  return freeze({ referenceType, aggregateType, cachedBuildFor, error });
}

export const ContextDeclarationBuild_ = freeze({ make });
