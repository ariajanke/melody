import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';

const { freeze } = Helpers;

export const FunctionTypeBuildBase = freeze({
  makeSuccessFromType(functionType: FunctionType): FunctionTypeBuild {
    return freeze({
      functionType: () => functionType,
      error: () => StandardError.make().error()
    });
  }
});
