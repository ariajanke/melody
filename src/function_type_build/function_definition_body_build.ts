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
  // now we can accumulate names
  // we can pass a parent into here
  // then just declare our "implied" functions
  // and boom we have our "captured" variables

  const { error, setErrorFn } = StandardError.make();
  const contextType = memoize(() => {
    const contextBuild = ContextBuild.
      make(mDefs.declaredNames,
           mIntoFunctionTypeBuild,
           mHoldAsContextType);
    
    return contextBuild.contextType() ?? setErrorFn(contextBuild.error);
  });

  const functionType = memoize(() => {
    return mHoldAsContextType(contextType as () => ObjectType, () => {
      if (!contextType())
        { return undefined; }

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
