import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild } from '../../function_type_build';
import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { DeclarationsBuildOrder } from './declarations_build_order';

const { freeze, memoize } = Helpers;

export interface DeclarationValuesMapBuild {
  /// NOTE if this returns, then all subsequent builds are successful
  valueToBuildCacheFunction(): ((node: DastNode) => FunctionTypeBuild | undefined) | undefined;
  error(): StandardErrorMessage;
}

export const DeclarationValuesMapBuild = freeze({
  make(mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
    : DeclarationValuesMapBuild
  {
    const { setErrorFn, error } = StandardError.make();

    const { buildsInOrder, mapDastToBuild } = DeclarationsBuildOrder.
      make(mDeclarationsMap, mIntoFunctionTypeBuild);

    const failedBuild = memoize(() =>
      buildsInOrder().
      reduce((prev: FunctionTypeBuild | undefined, build: FunctionTypeBuild) => {
        if (prev)
          { return prev; }

        if (build.functionType())
          { return undefined; }

        return build;
      }, undefined));

    const valueToBuildCacheFunction = memoize(() => {
      const fbuild = failedBuild();
      if (fbuild) {
        return setErrorFn(fbuild.error);
      }

      return mapDastToBuild;
    });

    return freeze({ valueToBuildCacheFunction, error })
  }
});
