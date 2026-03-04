import { DastLetDeclaration } from '../dast_build';
import { Helpers, raise } from '../helpers';
import { FunctionType } from '../function_type_build';
// import { ContextTypeBuilder } from './context_factory_stage';
import { Token } from '../token';
import { ContextFactoryStage, ContextFunctionTypeBuild } from './context_factory_stage';

const { freeze } = Helpers;

// function make
//   (mFunctionName: string,
//    mDef: DastLetDeclaration,
//   //  mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
//    mValueFtype: FunctionType,
//    mStage: ContextFactoryStage)
//   : ContextFunctionTypeBuild
// {
//   const { error, setErrorFn } = StandardError.make();

//   const typeForDef = mValueFtype.returns;

//   // const typeForDef = memoize((): ObjectType | undefined => {
    
//   //   // we know what this is when value is a function definition
//   //   // we don't know for non-definitions
//   //   // each node on a DAST represents both a function and object type
//   //   // generally the relation between the function and object types
//   //   // for a node is that the return type of that function type is the object
//   //   const fbuild = mIntoFastBuild(mDef.value);
//   //   return fbuild.functionType()?.returns() ?? setErrorFn(fbuild.error);
//   // });

//   // const { addModifier, addAccessor, addInitialSet } = mBuilder;

//   const functionTypeBuild = memoize((): ContextFunctionTypeBuild | undefined => {
//     const type = typeForDef();
//     if (!type)
//       { return undefined; }

//     if (mDef.assignment) {
//       mStage.intoModifierBuild(mFunctionName, mDef.assignment, type);
//       // return addModifier(mFunctionName, mDef.assignment, type);
//     } else if (mDef.accessor) {
//       const callLookUp = type.lookUp(Token.kCallToken.content());
//       if (callLookUp) {
//         mStage.
//           intoDirectLookUp(mDef.accessor.variableName, callLookUp);
//       }
//       mStage.intoAccessorBuild(mFunctionName, mDef.accessor, type);
//       // if (callLookUp) {
//       //   mBuilder.addDirectLookUp(mDef.accessor.variableName, callLookUp);
//       // }
//       // return addAccessor(mFunctionName, mDef.accessor, type);
//     } else if (mDef.initialSet) {
      
//       // return addInitialSet(mFunctionName, mDef.initialSet.variableNames, type);
//       mStage.intoInitialSetBuild(mFunctionName, mDef.initialSet.variableNames, type);
//     }

//     // NOTE: this suggests that the declaration is malformed
//     raise(`Expected either "assignment", "accessor", or "initialSet" field for ` +
//           `declaration of "${mFunctionName}"`);
//   });

//   functionTypeBuild()?.intoFactoryStage();

//   const functionType = memoize(() => {
//     if (!typeForDef())
//       { return undefined; }
//     return functionTypeBuild()?.
//       functionType() ?? setErrorFn(functionTypeBuild()!.error);
//   });

//   return freeze({ functionType, error });
// }

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
