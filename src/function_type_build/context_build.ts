import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
// import { ContextBuildPerDeclaration } from './context_build_per_declaration';
import { ContextFactoryStage } from './context_factory_stage';
import { DeclaredContextStack } from './declared_context_stack';
import { BuiltinFunctionNames } from '../builtin_function_names';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { ContextBuildDelegation } from './context_build_delegation';
import { FunctionBodyPrefaceBuild } from './function_body_preface_build';

const { freeze, memoize } = Helpers;

export interface ContextInfo {
  contextType(): ObjectType;
  preface(): FunctionType;
};

export interface ContextBuild {
  info(): ContextInfo | undefined;
  error(): StandardErrorMessage;
};

function make
  (mDefs: DastFunctionNameMappings,
   mIntoFTypeBuild: (dnode: DastNode) => FunctionTypeBuild,
   mStackThing: DeclaredContextStack,
   mStage = ContextFactoryStage.make())
  : ContextBuild
{
  
  const mUsedAncestorCollection = UsedAncestorCollection.
    make(mStackThing, mDefs.pendingNames);
  
  const { error, setErrorFn } = StandardError.make();

  const addPuts = ((): ContextFactoryStage =>
    mStage.intoDirectLookUp(BuiltinFunctionNames.kPuts,
                            PutsFunctionLookUpTable.instance()));

  const prefaceBuild = FunctionBodyPrefaceBuild.
    make(mStage, mUsedAncestorCollection);

  const prefaceFunctionType = prefaceBuild.functionType;

  const { applyDelegations } = ContextBuildDelegation.
    make(mStage, mStackThing, mDefs.pendingNames);

  const contextType = memoize((): ObjectType | undefined => {
    addPuts() && prefaceFunctionType() && applyDelegations();

    // phase 1: declared names into a layout, context type with stubs
    // phase 2: with layout get actual ftypes replacing those stubs

    // we have to have a we to clear the cache of DAST nodes processed here
    for (const functionName in mDefs.declaredNames) {
      functionName;
    }
    // no no no, just build an additional map, don't rely on an implicit cache
    for (const functionName in mDefs.declaredNames) {
      const decl = mDefs.declaredNames[functionName];
      const build = mIntoFTypeBuild(decl.value);
      if (!build.functionType())
        { return setErrorFn(build.error); }

      // const declaration = ContextBuildPerDeclaration.
      //   selectBuildForDeclaration(functionName, decl, build.functionType()!, mStage);
      // if (!declaration.functionType()) {
      //   return setErrorFn(declaration.error);
      // }
    }
    return mStage.intoObjectType();
  });

  return freeze({
    info: memoize((): ContextInfo | undefined => {
      if (!contextType())
        { return undefined; }
      return freeze({
        contextType: contextType as () => ObjectType,
        preface: prefaceFunctionType
      });
    }),
    error
  });
}

export const ContextBuild = freeze({ make });
