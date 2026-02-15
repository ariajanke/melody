import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextBuild } from './context_build';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';
import { DastLetDeclations, DastNode } from '../dast_build';
import { HoldContextTypeFunction } from './function_type_build_visitor';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastLetDeclations,
   mNodes: Readonly<DastNode[]>,
   // last two params are tightly coupled, guh
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mHoldAsContextType: HoldContextTypeFunction
  )
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();
  return freeze({
    functionType: memoize(() => {
      const contextBuild = ContextBuild.
        make(mDefs,
             mIntoFunctionTypeBuild,
             mHoldAsContextType);
      
      const contextType = contextBuild.contextType();
      if (!contextType) {
        return setErrorFn(contextBuild.error);
      }

      // NOTE remember, memoization
      const getContextType = contextBuild.contextType as () => ObjectType;
      return mHoldAsContextType(getContextType, () => {
        const cleanUpBuild = FunctionSequenceStackCleanUp.
          make(mNodes.map(mIntoFunctionTypeBuild));
        const compositeFunctionType = cleanUpBuild.functionType();
        if (!compositeFunctionType)
          { return setErrorFn(cleanUpBuild.error); }

        return compositeFunctionType;
      });
    }),
    error
  });
}

export const FunctionDefinitionBuild = freeze({ make });
