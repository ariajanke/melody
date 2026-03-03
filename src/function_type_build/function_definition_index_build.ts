import { FunctionTypeBuild } from '../function_type_build';
import { Helpers } from '../helpers';
import { FunctionDefinitionBodyBuild } from './function_definition_body_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { HoldContextTypeFunction } from './function_type_build_visitor';
import { FunctionTypeRegistry } from '../function_type_registry';

const { freeze, memoize } = Helpers;

// might be mergable with body build
function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mHoldAsContextType: HoldContextTypeFunction,
   mFunctionRegistry: FunctionTypeRegistry)
  : FunctionTypeBuild
{
  const defBuild = FunctionDefinitionBodyBuild.
    make(mDefs, mNodes, mIntoFunctionTypeBuild, mHoldAsContextType);

  const { error } = defBuild;

  const functionType = memoize(() => {
    const compositeFunctionType = defBuild.functionType();
    if (!compositeFunctionType)
      { return undefined; }
    return mFunctionRegistry.indexEmissionOf(compositeFunctionType);
  });
  return freeze({ functionType, error });
}

export const FunctionDefinitionIndexBuild = freeze({ make });
