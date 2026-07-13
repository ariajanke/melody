import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise, StandardError } from '../../helpers';
import { ContextDeclarationBuild } from '../context_build';
import { MutableFunctionTable } from '../mutable_function_table';
import { TupleObjectFactory } from '../tuple_type';
import { ContextAttributeFactory } from './context_attribute_factory';
import { FunctionOpLookUp } from './context_base_stage';
import { DeclarationVariableAllocation } from './declaration_variable_allocation';
import { VariableAllocation } from './variable_allocation';
import { DeclarationValuesMapBuild } from './declaration_values_map_build';

const { freeze, memoize } = Helpers;

export const ContextDeclarationBuild_ = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReferenceTypeLookUpTable: FunctionOpLookUp,
       mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
       mReferenceType: ObjectType
  ): ContextDeclarationBuild
  {
    const { error, setErrorFn } = StandardError.make();
    // declaration value ftypes, build in order, if that mapper ain't there
    // it failed
    const valuesMapBuild = DeclarationValuesMapBuild.
      make(mDeclarationsMap, mIntoFunctionTypeBuild);

    const returnTypeOf = memoize(() => {
      const toBuild = valuesMapBuild.valueToBuildCacheFunction();
      if (!toBuild)
        { return setErrorFn(valuesMapBuild.error); }

      return (node: DastNode) =>
        toBuild(node)?.functionType()?.returns() ??
          raise('');
    });

    const fullVariableAllocation = memoize(() => {
      const rtOf = returnTypeOf();
      if (!rtOf)
        { return undefined; }

      return DeclarationVariableAllocation.
        make(mVariableAllocation, rtOf, mDeclarationsMap).
        variableAllocation();
    });

    function addContextFunctions() {
      const varAlloc = fullVariableAllocation();

      if (!varAlloc) 
        { return undefined; }

      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        if (decl.accessor) {
          const varInfo = varAlloc.lookUp(decl.accessor.variableName);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildGetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(TupleObjectFactory.emptyTuple(), ftype);
        }
        if (decl.assignment) {
          const varInfo = varAlloc.lookUp(decl.assignment.variableName);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildSetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(varInfo.type, ftype);
        }
        if (decl.initialSet) {
          const varInfo = varAlloc.lookUp(decl.initialSet.);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildSetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(varInfo.type, ftype);
        }
      }
    }

    // what's the aggregate type?
    // pretty simple, we're not throwing aggregates around atm
    // this is essentially just for the ftype call builds
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

      addContextFunctions();
      return mReferenceType;
    })

    return freeze({ referenceType, aggregateType, error });
  }
});
