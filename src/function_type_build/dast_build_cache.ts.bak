import { DastDeclarationMap, DastNode } from '../dast_build';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, raise } from '../helpers';

const { freeze } = Helpers;

export interface DastBuildCache {
  checkCachedBuild(node: DastNode): FunctionTypeBuild;
  clearBuildFor(declarationMap: DastDeclarationMap): void;
};

function make
  (mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : DastBuildCache
{
  const mCache: { [uid: number]: FunctionTypeBuild | undefined } = {};

  return freeze({
    clearBuildFor(declarationMap: DastDeclarationMap): void {
      for (const name in declarationMap) {
        const uid = declarationMap[name].value.uid();
        if (!mCache[uid]) {
          raise(`Likely unintended removal (was the prototype context built?)`);
        }
        mCache[uid] = undefined;
      }
    },
    checkCachedBuild: (node: DastNode): FunctionTypeBuild =>
      mCache[node.uid()] ??= mIntoFunctionTypeBuild(node)
  });
}

export const DastBuildCache = freeze({ make });
