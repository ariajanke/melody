import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { Token } from '../token';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

export const FringeFunctionBuild = freeze({
  make(name: string, topContextType: () => ObjectType): FunctionTypeBuild {
    const { error, setErrorMessage } = StandardError.make();
    return freeze({
      functionType: memoize(() => {
        if (name !== Token.kContextToken.content()) {
          name = FunctionNamingSchema.mapToFringeAccessor(name);
        }
        const ftype = topContextType().lookUp(name)?.byParameters(TupleObjectFactory.emptyTuple());
        // TODO remove me
        if (ftype) {
          return ftype;
        }
        return ftype ??
          setErrorMessage(`Cannot find function for "${name}"`);
      }),
      error
    });
  }
});
