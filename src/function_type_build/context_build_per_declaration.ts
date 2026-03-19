import { DastLetDeclaration } from '../dast_build';
import { Helpers, raise } from '../helpers';
import { FunctionType } from '../function_type_build';
import { Token } from '../token';
import { ContextFactoryStage, ContextFunctionTypeBuild } from './context_factory_stage';

const { freeze } = Helpers;

function selectBuildForDeclaration
  (mFunctionName: string,
   mDef: DastLetDeclaration,
   mValueFtype: FunctionType,
   mStage: ContextFactoryStage): ContextFunctionTypeBuild
{
  const type = mValueFtype.returns();

  if (mDef.assignment) {
    return mStage.intoModifierBuild(mFunctionName, mDef.assignment, type);
  } else if (mDef.accessor) {
    const callLookUp = type.lookUp(Token.kCallToken.content());
    if (callLookUp) {
      mStage.
        intoDirectLookUp(mDef.accessor.variableName, callLookUp);
    }
    return mStage.intoAccessorBuild(mFunctionName, mDef.accessor, type);
  } else if (mDef.initialSet) {    
    return mStage.intoInitialSetBuild(mFunctionName, mDef.initialSet.variableNames, type);
  }

  // NOTE: this suggests that the declaration is malformed
  raise(`Expected either "assignment", "accessor", or "initialSet" field for ` +
        `declaration of "${mFunctionName}"`);
}

export const ContextBuildPerDeclaration = freeze({ selectBuildForDeclaration });
