import { DastNode } from '../dast_build';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { ContextTypeProgression, ReceiverResolution } from './context_build';
import { ContextFrameSnapshot, WritableContextFrameStack } from './context_frame_stack';

const { freeze, memoize } = Helpers;

export interface CachingContextProgression extends ContextTypeProgression {
  baseFrameEntry(): ContextFrameSnapshot;
};

function make
  (mStackFrameStack: WritableContextFrameStack,
   mReceiverResolution: ReceiverResolution,
   mUniqueName: string)
  : CachingContextProgression
{
  const mCache: { [dastNodeUid: number]: FunctionTypeBuild | undefined } = {};

  const mIntoFunctionTypeBuild = mStackFrameStack.intoBuildFunction();
  
  const baseFrameEntry = memoize((): ContextFrameSnapshot => freeze({
    referenceType: () => raise('should never be called'),
    receiverResolution: () => mReceiverResolution,
    uniqueName: () => mUniqueName,
    intoBuildFor: (node: DastNode) =>
      mCache[node.uid()] ?? mIntoFunctionTypeBuild(node)
  }));

  function nextUndeferredBuild
    (currentFrameType: ObjectType, node: DastNode)
    : FunctionTypeBuild
  {
    const snapshot = freeze({
      ...baseFrameEntry(),
      referenceType: () => currentFrameType
    });

    return mStackFrameStack.withBaseReferenceType(snapshot, () => {
      const fbuild = mIntoFunctionTypeBuild(node);
      
      // NOTE undeferred, and we rely on memoization
      fbuild.functionType();
      mCache[node.uid()] = fbuild;

      return fbuild;
    });
  }
  
  return freeze({ nextUndeferredBuild, baseFrameEntry });
}

export const CachingContextProgression = freeze({ make });
