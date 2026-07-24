import { Helpers, raise, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';
import { ContextFrameSnapshot, WritableContextFrameStack } from './context_frame_stack';
import { ContextBaseStage, ContextDeclarationBuild, ContextLinkStage } from './context_build';
import { TupleObjectFactory } from './tuple_type_factory';
import { FunctionTypeBase } from './function_type_base';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   mStackFrameStack: WritableContextFrameStack)
  : FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  // NOTE order dependant, must be done before the whole "with..."
  const parentType = memoize(() =>
    mStackFrameStack.depth() === 0 ?
    TupleObjectFactory.emptyTuple() : 
    mStackFrameStack.topFrame().referenceType());

  // NOTE order dependant, must be done before the whole "with..."
  const mIntoFunctionTypeBuild = mStackFrameStack.intoBuildFunction();

  const baseStage = memoize(ContextBaseStage.make);

  const linkStage = memoize((): ContextLinkStage =>
    baseStage().contextLinkStage( mDefs.pendingNames, mStackFrameStack ));

  const fullContextBuild = memoize((): ContextDeclarationBuild =>
    linkStage().next().next(mDefs.declaredNames, mIntoFunctionTypeBuild));

  // NOTE hidden dependancy:
  //      indirect calls need to know how big the aggregate type is
  let mSetAggregateType: ObjectType | 'not ready' = 'not ready';

  const currentFrameSnapshot = memoize((): ContextFrameSnapshot | undefined => {
    const { referenceType } = baseStage();
    const { receiverResolution } = linkStage();

    return freeze({
      referenceType: referenceType as () => ObjectType,
      aggregateType: (() => mSetAggregateType) as () => ObjectType | 'not ready',
      receiverResolution,
      uniqueName: () => mDefs.name,
      
      intoBuildFor(node: DastNode) {
        if (mSetAggregateType === 'not ready') {
          raise('should not be called yet!');
        }
        return intoFunctionTypeBuildFunc()(node);
      }
    })
  });

  // TODO this doesn't get passed down though...
  const intoFunctionTypeBuildFunc = memoize(() => {
    const { cachedBuildFor } = fullContextBuild();

    return (node: DastNode) =>
      cachedBuildFor(node) ?? mIntoFunctionTypeBuild(node);
  });

  const functionType = memoize((): FunctionType | undefined => {
    if (!currentFrameSnapshot())
      { return undefined; }

    // NOTE order dependant, must be done before the whole "with..."
    parentType();

    const intF = mStackFrameStack.withBaseReferenceType(currentFrameSnapshot()!, () => {
      const { preface } = linkStage();
      const { aggregateType } = fullContextBuild();
      if (!aggregateType()) {
        return setErrorFn(fullContextBuild().error);
      }
      // wrap my code writer, s.t. it gets extended?!
      // TODO needs to be in "emit"
      mSetAggregateType = aggregateType()!;

      const subBuilds: FunctionTypeBuild[] = [];
      subBuilds.
        push(FunctionTypeBuildBase.makeSuccessFromType(preface()),
             ...mNodes.map(intoFunctionTypeBuildFunc()));
      const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
      const compositeFunctionType = cleanUpBuild.functionType();
      if (!compositeFunctionType)
        { return setErrorFn(cleanUpBuild.error); }

      return compositeFunctionType;
    });

    if (!intF)
      { return undefined; }

    // mmm... not quite right
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: parentType,
      simpleEmit: intF.simpleEmit
    })
  });

  // as root, received by "Tuple()"
  // all others, received by "parent"

  return freeze({ functionType, error });
}

export const DefinitionBodyFunctionBuild = freeze({ make });
