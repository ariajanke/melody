import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError, StandardErrorFn } from '../helpers';

const { freeze, memoize } = Helpers;

export const FunctionTypeBuildBase = freeze({
  makeSuccessFromType(functionType: FunctionType): FunctionTypeBuild {
    return freeze({
      functionType: () => functionType,
      error: () => StandardError.make().error()
    });
  },
  makeError(message: string): FunctionTypeBuild {
    return freeze({
      functionType: () => undefined,
      error: memoize(() => ({ message }))
    });
  },
  makeFromErrorFn(error: StandardErrorFn): FunctionTypeBuild {
    return freeze({ functionType: () => undefined, error });
  }
});
