import {
  DastAttributeDeclaration,
  DastDeclarationMap,
  DastLetDeclaration,
  DastLetDeclarationN,
  DastNode
} from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextTypeBuilder, ContextTypeBuilderN } from './context_type_builder';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';
import { VariableTracker } from './variable_tracker';
import { FunctionNamingSchema } from '../function_naming_schema';
import { TupleObjectFactory } from './tuple_type';
import { ContextAttributeFactory } from './context_attribute_factory';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

export interface ContextBuild {
  contextType(): ObjectType | undefined;
  error(): StandardErrorMessage;
}
// type AttributeDeclaration = DastLetDeclarationN['accessor'];
// AttributeDeclaration satisfies DastLetDeclarationN['assignment'];

// good, good SRP, short and sweet chef's kiss
const ContextBuildPerDeclarationN = freeze({
  make(mFunctionName: string,
       mDef: DastLetDeclarationN,
       mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
       mBuilder: ContextTypeBuilderN): FunctionTypeBuild
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
});


const ContextBuildPerDeclaration = freeze({
  make(mFunctionName: string,
       mDef: DastLetDeclaration,
       mIntoFastBuild: (dnode: DastNode) => FunctionTypeBuild,
       mBuilder: ContextTypeBuilder): FunctionTypeBuild
  {
    const { error, setErrorFn } = StandardError.make();

    const typeForDef = memoize((): ObjectType | undefined => {
      const fbuild = mIntoFastBuild(mDef.value);
      const valueNodeAsFt = fbuild.functionType();
      if (!valueNodeAsFt) {
        return setErrorFn(fbuild.error);
      }
      return valueNodeAsFt.returns();
    });

    const functionType = memoize(() => {
      if (!typeForDef())
        { return undefined; }
      if (mDef.functionKind === 'assignment') {
        return mBuilder.addModifier(mFunctionName, typeForDef()!);
      } else if (mDef.functionKind === 'accessor') {
        return mBuilder.addAccessor(mFunctionName, typeForDef()!);
      }

      if (!mDef.variableNames || mDef.functionKind !== 'initialSet') {
        throw new Error(`Expected variable names for initialSet declaration of ` +
                        `"${mFunctionName}", on kind "${mDef.functionKind}"`);
      }
      const fbuild = mBuilder.
        addInitialSet(mFunctionName, mDef.variableNames, typeForDef()!);

      return fbuild.functionType() ?? setErrorFn(fbuild.error);
    });

    return freeze({ functionType, error });
  }
});

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
