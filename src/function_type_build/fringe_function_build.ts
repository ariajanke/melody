import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

export const FringeFunctionBuild = freeze({
  make(name: string, topContextType: () => ObjectType): FunctionTypeBuild {
    const { error, setErrorMessage } = StandardError.make();
    return freeze({
      functionType: memoize(() => {
        if (name !== FunctionNamingSchema.kContextName) {
          name = FunctionNamingSchema.mapToFringeAccessor(name);
        }
        return topContextType().
          lookUp(name)?.
          byParameters(TupleObjectFactory.emptyTuple()) ??
          setErrorMessage(`Cannot find function for "${name}"`);
      }),
      error
    });
  }
});
