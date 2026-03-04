import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
// import { ContextTypeBuilder } from './context_factory_stage';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';
import { ContextBuildPerDeclaration } from './context_build_per_declaration';
import { ContextFactoryStage } from './context_factory_stage';

const { freeze, memoize } = Helpers;

export interface ContextBuild {
  contextType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

// const kParentContextName = '<parent>';

// need a implied accessor method build

function make
  (mDefs: DastFunctionNameMappings,
   mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
   // omg, holder has to come all the way down to here
   mHoldAsContextType: HoldContextTypeFunction,
   mParentContextType?: ObjectType,
   mStage = ContextFactoryStage.make())
  : ContextBuild
{
  const { error, setErrorFn } = StandardError.make();
  
  const addPuts = (() =>
    mStage.intoDirectLookUp('puts', PutsFunctionLookUpTable.instance()));
  const addParent = (() => {
    if (Object.keys(mDefs.pendingNames).length === 0 ||
        !mParentContextType)
      { return true; }

    mStage.intoParentBuild( mParentContextType );
    return true;
  });

  const contextType = memoize((): ObjectType | undefined => {
    addPuts() && addParent();
    const contextObjectType = mStage.intoObjectType;

    // skip this for now until everything else is working
    // for (const pendingName in mDefs.pendingNames) {
    //   // here, we'll need to build sort of "delegates" onto parent

    //   // look up on parent
    //   // if no parent, the same "not found" error
    //   // if not found, error      
    // }

    for (const functionName in mDefs.declaredNames) {
      const decl = mDefs.declaredNames[functionName];

      // have to hold at each step, such that the context type can evolve
      const newStage = mHoldAsContextType(contextObjectType, () => {
        const build = mIntoFastBuild(decl.value);
        if (!build.functionType())
          { return setErrorFn(build.error); }

        const declaration = ContextBuildPerDeclaration.
          selectBuildForDeclaration(functionName, decl, build.functionType()!, mStage);
        if (!declaration.functionType()) {
          return setErrorFn(declaration.error);
        }

        return declaration.intoFactoryStage();
      });
      if (!newStage)
        { return undefined; }
      // resets here is not great, trying to get closer to "functional" friendly
      mStage = newStage;
    }
    return mStage.intoObjectType();
  });

  return freeze({
    contextType,
    error
  });
}

export const ContextBuild = freeze({ make });
