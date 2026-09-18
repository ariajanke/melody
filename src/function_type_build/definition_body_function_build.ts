import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';
import { ContextFrameSnapshot, WritableContextFrameStack } from './context_frame_stack';
import { ContextDeclarationBuild, ContextLinkStage } from './context_build';
import { CachingContextProgression } from './caching_context_progression';
import { ContextualizedBodyFunctionBuild } from './contextualized_body_function_build';
import { AstNode } from '../ast_node';
import { ContextBaseNamesSet } from './context_base_names_set';

const { freeze, memoize } = Helpers;

function make
  (mUid: number,
   mNodes: Readonly<AstNode[]>,
   mStackFrameStack: WritableContextFrameStack)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const baseStage = memoize(() =>
    ContextBaseNamesSet.instance().ensure(mUid));

  const namesRetrieval = memoize(() =>
    ContextBaseNamesSet.instance().contextNamesFor(mUid, mNodes));

  const linkStage = memoize((): ContextLinkStage =>
    baseStage().contextLinkStage( namesRetrieval().pendingNames(), mStackFrameStack ));

  const fullContextBuild = memoize((): ContextDeclarationBuild =>
    linkStage().next(namesRetrieval().declarations(), contextTypeProgression()));

  const contextTypeProgression = memoize(() => CachingContextProgression.
    make(mStackFrameStack,
         linkStage().receiverResolution(),
         baseStage().referenceType().name()
     ));

  const aggregateType = () => fullContextBuild()?.aggregateType();

  const finalFrameSnapshot = memoize((): ContextFrameSnapshot | undefined => {
    const { referenceType } = fullContextBuild();
    if (!referenceType()) {
      return setErrorFn(fullContextBuild().error);
    }

    return freeze({
      ...contextTypeProgression().baseFrameEntry(),
      referenceType: () => referenceType()!
    });
  });

  // TODO
  // verify that initial sets are called in proper order

  const functionType = memoize((): FunctionType | undefined => {
    if (!finalFrameSnapshot())
      { return undefined; }

    return mStackFrameStack.withBaseReferenceType(finalFrameSnapshot()!, () => {
      const fbuild = ContextualizedBodyFunctionBuild.
        make(linkStage().preface(),
             aggregateType()!,
             mNodes,
             mStackFrameStack.intoBuildFunction());

      return fbuild.functionType() ?? setErrorFn(fbuild.error);
    });
  });

  return freeze({ functionType, error });
}

export const DefinitionBodyFunctionBuild = freeze({ make });
