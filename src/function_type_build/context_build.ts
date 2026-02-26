import { DastDeclarationMap, DastNode } from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextTypeBuilder } from './context_type_builder';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';
import { ContextBuildPerDeclaration } from './context_build_per_declaration';

const { freeze, memoize } = Helpers;

export interface ContextBuild {
  contextType(): ObjectType | undefined;
  error(): StandardErrorMessage;
}

function make
  (mDefs: DastDeclarationMap,
   mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
   mHoldAsContextType: HoldContextTypeFunction,
   mBuilder = ContextTypeBuilder.make())
  : ContextBuild
{
  const { error, setErrorFn } = StandardError.make();
  const mInProgressType = mBuilder.objectType;

  const contextType = memoize((): ObjectType | undefined => {
    mBuilder.addDirectLookUp('puts', PutsFunctionLookUpTable.instance());

    return mHoldAsContextType(mInProgressType, () => {
      for (const functionName in mDefs) {
        // thankfully these builds are cached :)
        const decl = mDefs[functionName];

        const declaration = ContextBuildPerDeclaration.
          make(functionName, decl, mIntoFastBuild, mBuilder);
        if (!declaration.functionType()) {
          return setErrorFn(declaration.error);
        }
      }
      return mInProgressType();
    });
  });

  return freeze({
    contextType,
    error
  });
}

export const ContextBuild = freeze({ make });
