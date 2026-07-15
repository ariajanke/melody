import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { FunctionOpLookUp } from './context_base_stage';
import { DeclarationFunctionGroup, NameTypePair } from './declaration_function_group';
import { DeclarationLookUpTable } from './declaration_look_up_table';
import { OrderedDeclarationsGroupCollection } from './ordered_declaration_groups_collection';
import { VariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface ContextDeclarationBuild_ {
  // TODO also get our cached (DAST node -> ftype build) map?
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
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
  const { error, setErrorFn } = StandardError.make();

  const { orderedGroups } = OrderedDeclarationsGroupCollection.make(mDeclarationsMap, mIntoFunctionTypeBuild);

  const fullVariableAllocation = memoize(() => orderedGroups().
    reduce((startingAlloc: VariableAllocation | undefined, t: DeclarationFunctionGroup) => {
      if (!startingAlloc)
        { return undefined; }

      // NOTE higly state dependant, build the base value node first
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

      return newAlloc;
    }, mVariableAllocation));

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

  const referenceType = memoize((): ObjectType | undefined => {
    if (!fullVariableAllocation())
      { return undefined; }

    return mReferenceType;
  });

  return freeze({ referenceType, aggregateType, error });
}

export const ContextDeclarationBuild_ = freeze({ make });
