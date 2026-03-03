import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextBuild } from './context_build';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { HoldContextTypeFunction } from './function_type_build_visitor';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   // last two params are tightly coupled, guh
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mHoldAsContextType: HoldContextTypeFunction
  )
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();
  const contextType = memoize(() => {
    const contextBuild = ContextBuild.
      make(mDefs.declaredNames,
           mIntoFunctionTypeBuild,
           mHoldAsContextType);
    
    return contextBuild.contextType() ?? setErrorFn(contextBuild.error);
  });

  const functionType = memoize(() => {
    if (!contextType())
      { return undefined; }
    
    return mHoldAsContextType(contextType as () => ObjectType, () => {
      const subBuilds = mNodes.map(mIntoFunctionTypeBuild);
      const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
      const compositeFunctionType = cleanUpBuild.functionType();
      if (!compositeFunctionType)
        { return setErrorFn(cleanUpBuild.error); }

      return compositeFunctionType;
    });
  });

  return freeze({ functionType, error });
}

export const FunctionDefinitionBodyBuild = freeze({ make });
