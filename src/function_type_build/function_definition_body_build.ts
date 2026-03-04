import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextBuild } from './context_build';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { TupleObjectFactory } from './tuple_type';
import { CallBackObjectHold } from '../call_back_object_hold';
import { CodeWriter } from '../code_writer';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   // last two params are tightly coupled, guh
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
   mHolder: CallBackObjectHold<ObjectType>
   // pass in entire holder instead
  )
  : FunctionTypeBuild
{
  // now we can accumulate names
  // we can pass a parent into here
  // then just declare our "implied" functions
  // and boom we have our "captured" variables
  // pendingNames in root is valid (for DAST schema), albiet leads to an error on look up (function not defined)

  const { error, setErrorFn } = StandardError.make();
  // grab the parent now! (if it exists)
  const parentContextType = mHolder.optionalCurrentObject();
  const contextType = memoize(() => {
    const contextBuild = ContextBuild.
      make(mDefs,
           mIntoFunctionTypeBuild,
           mHolder.withHeldObject,
           parentContextType);
    
    return contextBuild.contextType() ?? setErrorFn(contextBuild.error);
  });

  const impliedInitialSetter = memoize((): FunctionTypeBuild => {
    const { emptyTuple } = TupleObjectFactory;

    const parentGetter = contextType()?.
      lookUp(FunctionNamingSchema.kParentName)?.
      byParameters(emptyTuple());

    // we always want to set the local sp
    const ftype: FunctionType = freeze({
      parameters: () => emptyTuple(),
      returns: () => emptyTuple(),
      emit(writer: CodeWriter) {
        writer.forStackPointer('saveToLocal');
        // if such parent exists, we have to have an "initial set" for it
        if (parentGetter) {
          writer.storeParentStackPointer();
        }
        return writer;
      },
      uid: memoize(Symbol)
    });

    return freeze({
      functionType: () => ftype,
      error: () => StandardError.make().error()
    });
  });

  const functionType = memoize(() => {
    return mHolder.withHeldObject(contextType as () => ObjectType, () => {
      if (!contextType())
        { return undefined; }

      const subBuilds: FunctionTypeBuild[] = [];
      if (impliedInitialSetter()?.functionType())
        { subBuilds.push(impliedInitialSetter()!); }
      subBuilds.push(...mNodes.map(mIntoFunctionTypeBuild));
      const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
      const compositeFunctionType = cleanUpBuild.functionType();
      if (!compositeFunctionType)
        { return setErrorFn(cleanUpBuild.error); }

      return compositeFunctionType;
    });
  });

  return freeze({ functionType, error });
}

export const FunctionDefinitionBodyBuild = freeze({ make });
