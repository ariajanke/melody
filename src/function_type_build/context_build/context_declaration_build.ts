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
  referenceType(): ObjectType | undefined;
  aggregateType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

export const ContextDeclarationBuild_ = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReferenceTypeLookUpTable: FunctionOpLookUp,
       mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
       mReferenceType: ObjectType
  ): ContextDeclarationBuild_
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

    
    // get our build order for initial sets
    // per initial set in order, for each var name build the values for each of
    //   var's functions, add those functions to the reference type's ftable
    // then repeat until you're out of initial sets
    // finish 

    // declaration value ftypes, build in order, if that mapper ain't there
    // it failed
    // const valuesMapBuild = DeclarationValuesMapBuild.
    //   make(mDeclarationsMap, mIntoFunctionTypeBuild);

    // const returnTypeOf = memoize(() => {
    //   const toBuild = valuesMapBuild.valueToBuildCacheFunction();
    //   if (!toBuild)
    //     { return setErrorFn(valuesMapBuild.error); }

    //   return (node: DastNode) =>
    //     toBuild(node)?.functionType()?.returns() ??
    //       raise('');
    // });

    // const fullVariableAllocation = memoize(() => {
    //   const rtOf = returnTypeOf();
    //   if (!rtOf)
    //     { return undefined; }

    //   return DeclarationVariableAllocation.
    //     make(mVariableAllocation, rtOf, mDeclarationsMap).
    //     variableAllocation();
    // });

    // function addContextFunctions() {
    //   const varAlloc = fullVariableAllocation();

    //   if (!varAlloc) 
    //     { return undefined; }

    //   for (const name in mDeclarationsMap) {
    //     const decl = mDeclarationsMap[name];
    //     if (decl.accessor) {
    //       const varInfo = varAlloc.lookUp(decl.accessor.variableName);
    //       if (!varInfo) { raise('oh no!'); }
    //       const ftype = ContextAttributeFactory.
    //         buildGetter(varInfo.accessIndex, varInfo.type);
    //       mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
    //         setDefinition(TupleObjectFactory.emptyTuple(), ftype);
    //     }
    //     if (decl.assignment) {
    //       const varInfo = varAlloc.lookUp(decl.assignment.variableName);
    //       if (!varInfo) { raise('oh no!'); }
    //       const ftype = ContextAttributeFactory.
    //         buildSetter(varInfo.accessIndex, varInfo.type);
    //       mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
    //         setDefinition(varInfo.type, ftype);
    //     }
    //     if (decl.initialSet) {
    //       const varInfo = varAlloc.lookUp(decl.initialSet.);
    //       if (!varInfo) { raise('oh no!'); }
    //       const ftype = ContextAttributeFactory.
    //         buildSetter(varInfo.accessIndex, varInfo.type);
    //       mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
    //         setDefinition(varInfo.type, ftype);
    //     }
    //   }
    // }

    // // what's the aggregate type?
    // // pretty simple, we're not throwing aggregates around atm
    // // this is essentially just for the ftype call builds
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
});
