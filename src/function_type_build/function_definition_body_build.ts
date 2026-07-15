import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
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

  const fullContextBuild = memoize((): ContextDeclarationBuild =>
    linkStage().next().next(mDefs.declaredNames, mIntoFunctionTypeBuild));

  // NOTE hidden dependancy:
  //      indirect calls need to know how big the aggregate type is
  let mSetAggregateType: ObjectType | 'not ready' = 'not ready';

  const currentFrameSnapshot = memoize((): ContextFrameSnapshot | undefined => {
    const { referenceType } = baseStage();
    const { receiverResolution } = linkStage();

    if (!referenceType())
      { return setErrorFn(fullContextBuild().error); }

    return freeze({
      referenceType: referenceType as () => ObjectType,
      aggregateType: (() => mSetAggregateType) as () => ObjectType | 'not ready',
      receiverResolution,
      uniqueName: () => mDefs.name
    })
  });

  const functionType = memoize((): FunctionType | undefined => {
    if (!currentFrameSnapshot())
      { return undefined; }

    return mStackFrameStack.withBaseReferenceType(currentFrameSnapshot()!, () => {
      const { preface } = linkStage();
      const { aggregateType } = fullContextBuild();
      if (!aggregateType()) {
        return setErrorFn(fullContextBuild().error);
      }
      mSetAggregateType = aggregateType()!;

      const subBuilds: FunctionTypeBuild[] = [];
      subBuilds.
        push(FunctionTypeBuildBase.makeSuccessFromType(preface()),
            ...mNodes.map(mIntoFunctionTypeBuild));
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
