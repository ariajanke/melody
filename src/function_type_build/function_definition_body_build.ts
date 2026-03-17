import { Helpers, StandardError } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { ContextBuild } from './context_build';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { WritableDeclaredContextStack } from './declared_context_stack';
import { ContextFactoryStage } from './context_factory_stage';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { FunctionSequenceStackCleanUp } from './function_sequence_stack_clean_up';

const { freeze, memoize } = Helpers;

function make
  (mDefs: DastFunctionNameMappings,
   mNodes: Readonly<DastNode[]>,
   // last two params are tightly coupled, guh
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
  //  mHolder: CallBackObjectHold<ObjectType>
   mDeclaredContextStack: WritableDeclaredContextStack
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
  // const parentContextType = mHolder.optionalCurrentObject();
  // const contextInfo = memoize(() => {
  //   const contextBuild = ContextBuild.
  //     make(mDefs,
  //          mIntoFunctionTypeBuild,
  //          mHolder.withHeldObject,
  //          parentContextType);
    
  //   return contextBuild.info() ?? setErrorFn(contextBuild.error);
  // });
  // const contextType = () => contextInfo()?.contextType();
  // const contextPreface = () => contextInfo()?.preface();

  // const impliedInitialSetter = memoize((): FunctionTypeBuild => {
  //   const { emptyTuple } = TupleObjectFactory;

  //   const parentGetter = contextType()?.
  //     lookUp(FunctionNamingSchema.kParentName)?.
  //     byParameters(emptyTuple());

  //   // we always want to set the local sp
  //   const ftype: FunctionType = freeze({
  //     ...FunctionTypeBase.receivedByContext(),
  //     emit(writer: CodeWriter) {
  //       writer.forStackPointer('saveToLocal');
  //       // if such parent exists, we have to have an "initial set" for it
  //       if (parentGetter) {
  //         writer.storeParentStackPointer();
  //       }
  //       return writer;
  //     }
  //   });

  //   return freeze({
  //     functionType: () => ftype,
  //     error: () => StandardError.make().error()
  //   });
  // });

  // const contextInfo = memoize(() => {
  //   const fuck = (stage: ContextFactoryStage, parent?: ObjectType) => {
  //     const contextBuild = ContextBuild.
  //       make(mDefs,
  //            mIntoFunctionTypeBuild,
  //            mDeclaredContextStack,
  //            parent,
  //            stage);
      
  //     return contextBuild.info() ?? setErrorFn(contextBuild.error);
  //   };
  //   return mDeclaredContextStack.withContextStage(mDefs, fuck);
  // });

  const functionType = memoize((): FunctionType | undefined => {
    const whatever = (stage: ContextFactoryStage, parent?: ObjectType) => {
      const contextBuild = ContextBuild.
        make(mDefs,
             mIntoFunctionTypeBuild,
             mDeclaredContextStack,
             parent,
             stage);
      
      const contextInfo = contextBuild.info();
      if (!contextInfo) 
        { return setErrorFn(contextBuild.error); }

      const subBuilds: FunctionTypeBuild[] = [];
      subBuilds.
        push(FunctionTypeBuildBase.makeSuccessFromType(contextInfo.preface()),
            ...mNodes.map(mIntoFunctionTypeBuild));
      const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
      const compositeFunctionType = cleanUpBuild.functionType();
      if (!compositeFunctionType)
        { return setErrorFn(cleanUpBuild.error); }

      return compositeFunctionType;
    };
    return mDeclaredContextStack.withContextStage(mDefs, whatever);
    
    // if (!contextInfo())
    //   { return undefined; }

    // const subBuilds: FunctionTypeBuild[] = [];
    // subBuilds.
    //   push(FunctionTypeBuildBase.makeSuccessFromType(contextInfo()!.preface()),
    //        ...mNodes.map(mIntoFunctionTypeBuild));
    // const cleanUpBuild = FunctionSequenceStackCleanUp.make(subBuilds);
    // const compositeFunctionType = cleanUpBuild.functionType();
    // if (!compositeFunctionType)
    //   { return setErrorFn(cleanUpBuild.error); }

    // return compositeFunctionType;
  });

  return freeze({ functionType, error });
}

export const FunctionDefinitionBodyBuild = freeze({ make });
