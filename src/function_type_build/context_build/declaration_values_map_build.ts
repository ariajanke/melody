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

        // NOTE
        // after each succesful build, we have to immediately add the whatever
        // the declaration creates on to the reference type
        // this way other DAST value nodes which depend on this one are
        // supported (e.g. no missing method error)

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
