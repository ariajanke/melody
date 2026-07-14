import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
// import { ContextBuild } from './context_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
// import { WritableDeclaredContextStack } from './declared_context_stack';
// import { ContextFactoryStage } from './context_factory_stage';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';
import { ContextFrameSnapshot, WritableContextFrameStack } from './context_frame_stack';
import { ContextBaseStage, ContextDeclarationBuild, ContextLinkStage } from './context_build';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   // v this has a "context" stack frame for nodes...
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mStackFrameStack: WritableContextFrameStack)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const baseStage = memoize(ContextBaseStage.make);

  const linkStage = memoize((): ContextLinkStage =>
    baseStage().contextLinkBuild( mDefs.pendingNames ));

  // hidden dependancy: indirect calls need to know how big the aggregate type is
  const fullContextBuild = memoize((): ContextDeclarationBuild =>
    linkStage().next().next(mDefs.declaredNames, mIntoFunctionTypeBuild));

  const currentFrameSnapshot = memoize((): ContextFrameSnapshot | undefined => {
    const { referenceType, aggregateType } = fullContextBuild();
    const { receiverResolution } = linkStage();

    if (!referenceType() || !referenceType())
      { return setErrorFn(fullContextBuild().error); }

    return freeze({
      referenceType: referenceType as () => ObjectType,
      aggregateType: aggregateType as () => ObjectType,
      receiverResolution,
      uniqueName: () => mDefs.name
    })
  });

  

  const functionType = memoize((): FunctionType | undefined => {
    if (!currentFrameSnapshot())
      { return undefined; }

    mStackFrameStack.withBaseReferenceType(currentFrameSnapshot()!, () => {
      
    });

    // mStackFrameStack.withBaseReferenceType()
    // const whatever = (stage: ContextFactoryStage): FunctionType | undefined => {
    //   const contextBuild = ContextBuild.
    //     make(mDefs,
    //          mIntoFunctionTypeBuild,
    //          mDeclaredContextStack,
    //          stage);
      
    //   const contextInfo = contextBuild.info();
    //   if (!contextInfo) 
    //     { return setErrorFn(contextBuild.error); }

    //   const subBuilds: FunctionTypeBuild[] = [];
    //   subBuilds.
    //     push(FunctionTypeBuildBase.makeSuccessFromType(contextInfo.preface()),
    //         ...mNodes.map(mIntoFunctionTypeBuild));
    //   const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
    //   const compositeFunctionType = cleanUpBuild.functionType();
    //   if (!compositeFunctionType)
    //     { return setErrorFn(cleanUpBuild.error); }

    //   return compositeFunctionType;
    // };
    // return mDeclaredContextStack.withContextStage(mDefs, whatever);
  });

  return freeze({ functionType, error });
}

export const FunctionDefinitionBodyBuild = freeze({ make });
