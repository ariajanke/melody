// import { FunctionNamingSchema } from '../function_naming_schema';
// import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
// import { TupleObjectFactory } from '../function_type_build/tuple_type';
import { DastAttributeDeclaration } from '../dast_build';
import { ObjectType } from '../function_type_build';
// import { VariableTracker } from './variable_tracker';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
// import { ContextAttributeFactory } from './context_attribute_factory';

const { freeze, memoize } = Helpers;

export interface ObjectTypeBuild {
  objectType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

export const ContextAttributeTypeBuild = freeze({
  make(mAttr: DastAttributeDeclaration,
       mBasedOn: ObjectType): ObjectTypeBuild
  {
    const { error, setErrorMessage } = StandardError.make();

    const objectType = memoize((): ObjectType | undefined => {
      if (mAttr.tupleRank === undefined) {
        return mBasedOn;
      }
      const asTupleTypes = mBasedOn.detuplify();
      if (!asTupleTypes) {
        return setErrorMessage(
          `Expected tuple type for variable "${mAttr.variableName}" with tupleRank, got non-tuple type "${mBasedOn.name()}"`);
      }
      if (asTupleTypes.length <= mAttr.tupleRank) {
        return setErrorMessage(
          `Tuple rank ${mAttr.tupleRank} out of bounds for variable "${mAttr.variableName}" with type "${mBasedOn.name()}"`);
      }
      return asTupleTypes[mAttr.tupleRank];
    });

    return freeze({ objectType, error });
  }
});

// export const ContextAccessorBuild = freeze({
//   make(mAttr: DastAttributeDeclaration,
//        mBasedOn: ObjectType,
//        mVariableTracker: VariableTracker): FunctionTypeBuild
//   {
//     const { error, objectType } = ContextAttributeTypeBuild.make(mAttr, mBasedOn);
//     const { ensureVariablePresence } = mVariableTracker;

//     const variableType = objectType;

//     const functionType = memoize((): FunctionType | undefined => {
//       if (!variableType())
//         { return undefined; }

//       const { type, accessIndex } =
//         ensureVariablePresence(mAttr.variableName, variableType()!);
      
//       return ContextAttributeFactory.buildGetter(accessIndex, type);
//     });

//     return freeze({ functionType, error });
//   }
// });

// export const ContextModifierBuild = freeze({
//   make(mAttr: DastAttributeDeclaration,
//        mBasedOn: ObjectType,
//        mVariableTracker: VariableTracker,
//        mInProgressType: ObjectType): FunctionTypeBuild
//   {
//     const { error, objectType } = ContextAttributeTypeBuild.make(mAttr, mBasedOn);
//     const { ensureVariablePresence } = mVariableTracker;
//     const { variableName } = mAttr;

//     const variableType = objectType;

//     const getter = memoize((): FunctionType => {
//       const { emptyTuple } = TupleObjectFactory;
//       const fringeName =
//         FunctionNamingSchema.mapToFringeAccessor(variableName);
//       const ftype = mInProgressType.lookUp(fringeName)?.byParameters(emptyTuple());
//       if (!ftype) {

//         throw new Error(`Cannot find fringe accessor "${fringeName}" for variable "${variableName}"`);
//       }
//       return ftype;
//     });

//     const functionType = memoize((): FunctionType | undefined => {
//       if (!variableType())
//         { return undefined; }

//       const { type, accessIndex } =
//         ensureVariablePresence(variableName, variableType()!);

//       return ContextAttributeFactory.buildSetter(accessIndex, type, getter());
//     });

//     return freeze({ functionType, error });
//   }
// });
