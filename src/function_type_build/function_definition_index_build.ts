import { FunctionTypeBuild } from '../function_type_build';
import { Helpers } from '../helpers';
import { FunctionDefinitionBodyBuild } from './function_definition_body_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionTypeRegistry } from '../function_type_registry';
// import { WritableDeclaredContextStack } from './declared_context_stack';

const { freeze, memoize } = Helpers;

// might be mergable with body build
function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mDeclaredContextStack: WritableDeclaredContextStack,
   mFunctionRegistry: FunctionTypeRegistry)
  : FunctionTypeBuild
{
  const defBuild = FunctionDefinitionBodyBuild.
    make(mDefs, mNodes, mIntoFunctionTypeBuild, mDeclaredContextStack);

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
