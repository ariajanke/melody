import { DastNode } from '../dast_build';
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

function make(mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild) {
  const mCache: { [uid: number]: FunctionTypeBuild | undefined } = {};

  return freeze({
    checkCachedBuild: (node: DastNode): FunctionTypeBuild =>
      mCache[node.uid()] ??= mIntoFunctionTypeBuild(node)
  });
}

export const DastBuildCache = freeze({ make });
