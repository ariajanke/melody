import { DastLetDeclaration, DastNode } from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextTypeBuilder } from './context_type_builder';
import { Token } from '../token';

const { freeze, memoize } = Helpers;

function make
  (mFunctionName: string,
   mDef: DastLetDeclaration,
   mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
   mBuilder: ContextTypeBuilder): FunctionTypeBuild
{
  const { error, setErrorFn } = StandardError.make();

  const typeForDef = memoize((): ObjectType | undefined => {
    const fbuild = mIntoFastBuild(mDef.value);
    return fbuild.functionType()?.returns() ?? setErrorFn(fbuild.error);
  });

  const { addModifier, addAccessor, addInitialSet } = mBuilder;

  const functionTypeBuild = memoize((): FunctionTypeBuild | undefined => {
    const type = typeForDef();
    if (!type)
      { return undefined; }

    if (mDef.assignment) {
      return addModifier(mFunctionName, mDef.assignment, type);
    } else if (mDef.accessor) {
      const callLookUp = type.lookUp(Token.kCallToken.content());
      if (callLookUp) {
        mBuilder.addDirectLookUp(mDef.accessor.variableName, callLookUp);
      }
      return addAccessor(mFunctionName, mDef.accessor, type);
    } else if (mDef.initialSet) {
      
      return addInitialSet(mFunctionName, mDef.initialSet.variableNames, type);
    }

    // NOTE: this suggests that the declaration is malformed
    throw new Error(`Expected either "assignment", "accessor", or "initialSet" field for ` +
                    `declaration of "${mFunctionName}"`);
  });

  const functionType = memoize(() => {
    if (!typeForDef())
      { return undefined; }
    return functionTypeBuild()?.
      functionType() ?? setErrorFn(functionTypeBuild()!.error);
  });

  return freeze({ functionType, error });
}

export const ContextBuildPerDeclaration = freeze({ make });
