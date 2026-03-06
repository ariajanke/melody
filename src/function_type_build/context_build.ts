import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
// import { ContextTypeBuilder } from './context_factory_stage';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';
import { ContextBuildPerDeclaration } from './context_build_per_declaration';
import { ContextFactoryStage } from './context_factory_stage';
import { FunctionNamingSchema } from '../function_naming_schema';
import { TupleObjectFactory } from './tuple_type';

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
    if (!mParentContextType)
      { return true; }

    // let's always add the <parent>, just to keep this simple
    // (so it's always available to that needy grandchild function)
    //
    // If we need to look up with arguments in tow, we need to account for dependancies
    // consider:
    // "f(a)" where both "f" and ".a" are pending
    // this is an existing problem with declarations

    mStage.intoParentBuild( mParentContextType );

    if (Object.keys(mDefs.pendingNames).length === 0)
      { return true; }
    
    for (const pendingName in mDefs.pendingNames) {
      const lookUpOnParent = mParentContextType.lookUp(pendingName);
      if (!lookUpOnParent)
        { continue; }
      // if not on parent, we may have to continue searching up
      const grandParentType = mParentContextType.
        lookUp(FunctionNamingSchema.kParentName)?.
        byParameters(TupleObjectFactory.emptyTuple())?.
        returns();
      if (!grandParentType)
        { continue; } // weiter!
    }
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
