import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { ContextBuild } from './context_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { WritableDeclaredContextStack } from './declared_context_stack';
import { ContextFactoryStage } from './context_factory_stage';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mDeclaredContextStack: WritableDeclaredContextStack)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const functionType = memoize((): FunctionType | undefined => {
    const whatever = (stage: ContextFactoryStage) => {
      const contextBuild = ContextBuild.
        make(mDefs,
             mIntoFunctionTypeBuild,
             mDeclaredContextStack,
             stage);
      
      const contextInfo = contextBuild.info();
      if (!contextInfo) 
        { return setErrorFn(contextBuild.error); }

      const subBuilds: FunctionTypeBuild[] = [];
      subBuilds.
        push(FunctionTypeBuildBase.makeSuccessFromType(contextInfo.preface()),
            ...mNodes.map(mIntoFunctionTypeBuild));
      const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
      const compositeFunctionType = cleanUpBuild.functionType();
      if (!compositeFunctionType)
        { return setErrorFn(cleanUpBuild.error); }

      return compositeFunctionType;
    };
    return mDeclaredContextStack.withContextStage(mDefs, whatever);
  });

  return freeze({ functionType, error });
}

export const FunctionDefinitionBodyBuild = freeze({ make });
