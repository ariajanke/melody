import { FunctionNamingSchema } from '../function_naming_schema';
import { ObjectType } from '../function_type_build';
import { VariableTracker } from './variable_tracker';
import { Helpers, raise } from '../helpers';
import { ContextFactoryStage, ContextFunctionTypeBuild, FunctionOpLookUp } from './context_factory_stage';
import { MutableFunctionTable } from './mutable_function_table';
import { InitialSetImplementation } from './initial_set_implementation';

const { freeze, memoize } = Helpers;

export const ContextInitialSetBuild = freeze({
  make(mName: string,
       mVariableNames: Readonly<string[]>,
       mBasedOn: ObjectType,
       mVariableTracker: VariableTracker,
       mTable: FunctionOpLookUp): ContextFunctionTypeBuild
  {
    const creation = InitialSetImplementation.
      make(mVariableNames, mBasedOn, mVariableTracker);
    const builtFunctionType = creation.functionType;

    const functionType = memoize(() => {
      if (!FunctionNamingSchema.isAnInitialSetName(mName)) {
        raise(`Expected an initial set name, got "${mName}"`);
      }
      const ftype = builtFunctionType();
      if (ftype) {
        mTable[mName] = MutableFunctionTable.
          make().
          setDefinition(mBasedOn, ftype);
      }
      return ftype;
    });

    return freeze({
      functionType,
      error: creation.error,
      intoFactoryStage: () => ContextFactoryStage.make(mVariableTracker, mTable)
    });
  }
});
