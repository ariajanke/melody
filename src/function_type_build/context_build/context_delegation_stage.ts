import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionLookUpTable, FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { ContextDeclarationBuild } from '../context_build';
import { ContextFrameStack } from '../context_frame_stack';
import { FunctionOpLookUp } from './context_base_stage';

const { freeze } = Helpers;

export interface ContextDelegationStage_ {
  next(declarationsMap: DastDeclarationMap,
       intoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
    : ContextDeclarationBuild;
};

function make
  (mPendingNames: { [name: string]: true },
   mReferenceTypeLookUpTable: FunctionOpLookUp,
   mFrameStack: ContextFrameStack,
   mReferenceType: ObjectType,
   mMakeDeclarationBuild: (mDeclarationsMap: DastDeclarationMap,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild) => ContextDeclarationBuild)
: ContextDelegationStage_
{
  function lookUpName(name: string): FunctionLookUpTable {
    const snapshot = mFrameStack.contextForHop(mFrameStack.hopCountFor(name));
    return snapshot?.referenceType()?.lookUp(name) ??
            raise(`Could find pending name '${name}'`);
  }

  const referenceType = (() => {
    for (const name in mPendingNames) {
      mReferenceTypeLookUpTable[name] = lookUpName(name);
    }

    return mReferenceType;
  });


  const next =
    (mDeclarationsMap: DastDeclarationMap,
      mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild) =>
    referenceType() && mMakeDeclarationBuild(mDeclarationsMap, mIntoFunctionTypeBuild);

  return freeze({ next });
}

export const ContextDelegationStage_ = freeze({ make });
