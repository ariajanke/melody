import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionType, ObjectType } from '../function_type_build';
import { TupleObjectFactory } from '../function_type_build/tuple_type';
import { DastAttributeDeclaration } from '../dast_build';
import { VariableTracker } from './variable_tracker';
import { Helpers, raise } from '../helpers';
import { ContextAttributeFactory } from './context_attribute_factory';
import { ContextFactoryStage, ContextFunctionTypeBuild, FunctionOpLookUp } from './context_factory_stage';
import { ContextAttributeTypeBuild } from './context_attribute_build';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

export const ContextModifierBuild = freeze({
  make(mName: string,
       mAttr: DastAttributeDeclaration,
       mBasedOn: ObjectType,
       mVariableTracker: VariableTracker,
       mTable: FunctionOpLookUp): ContextFunctionTypeBuild
  {
    // since we're just passing around the op table, we can just look up the accessor that way
    const { error, objectType } = ContextAttributeTypeBuild.make(mAttr, mBasedOn);
    const getter = memoize((): FunctionType => {
      const fringeName =
        FunctionNamingSchema.mapToFringeAccessor(mAttr.variableName);
      const ftype = mTable[fringeName]?.byParameters(TupleObjectFactory.emptyTuple());
      if (!ftype) {
        raise(`Cannot find fringe accessor "${fringeName}" for variable "${mAttr.variableName}"`);
      }
      return ftype;
    });

    const variableType = objectType;

    const builtFunctionType = memoize((): FunctionType | undefined => {
      if (!variableType())
        { return undefined; }

      const { type, accessIndex } =
        mVariableTracker.ensureVariablePresence(mAttr.variableName, variableType()!);
      
      return ContextAttributeFactory.buildSetter(accessIndex, type, getter());
    });

    // on completing a build, we add to the look up table
    const functionType = memoize(() => {
      if (!FunctionNamingSchema.isAnAssignmentName(mName)) {
        raise(`Expected a modifier name, got "${mName}"`);
      }

      const ftype = builtFunctionType();
      if (ftype) {
        mTable[mName] = MutableFunctionTable.
          make().
          setDefinition(getter().parameters(), ftype);
      }
      return ftype;
    });

    return freeze({
      functionType,
      error,
      intoFactoryStage: () =>
        ContextFactoryStage.make(mVariableTracker, mTable)
    });
  }
});
