import { DastAttributeDeclaration } from '../dast_build';
import { ObjectType } from '../function_type_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';

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
