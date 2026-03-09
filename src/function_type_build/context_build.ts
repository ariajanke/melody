import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage, raise } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { HoldContextTypeFunction } from './function_type_build_visitor';
import { ContextBuildPerDeclaration } from './context_build_per_declaration';
import { ContextFactoryStage } from './context_factory_stage';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { TupleObjectFactory } from './tuple_type';

const { freeze, memoize } = Helpers;

export interface ContextInfo {
  contextType(): ObjectType;
  preface(): FunctionType;
};

export interface ContextBuild {
  // contextType(): ObjectType | undefined;
  info(): ContextInfo | undefined;
  error(): StandardErrorMessage;
};

function make
  (mDefs: DastFunctionNameMappings,
   mIntoFTypeBuild: (dnode: DastNode) => FunctionTypeBuild,
   // I may need a whole ass stack abstraction
   // The problem is as I'm diving further up, those context types may yet be
   // incomplete!
   mHoldAsContextType: HoldContextTypeFunction,
   // parent might not be finished yet
   // but allow missing names, <parent> will be there (if needed)
   mParentContextType?: ObjectType,
   mStage = ContextFactoryStage.make())
  : ContextBuild
{
  const { error, setErrorFn } = StandardError.make();

  // for each pending name "a" do this:
  // - find the context where "a" is declared up the stack
  // - accumulate that context type
  // - create a delegate on declaring context type for this context type
  //
  // for each context type we need up the stack:
  // - create an initializer for it (i.e. compute the pointer ahead of time)
  // - create an accessor for it (for "alternate" receivers)
  // - the immediate parent is special

  
  const addPuts = (() =>
    mStage.intoDirectLookUp('puts', PutsFunctionLookUpTable.instance()));
  const hasParentGetter = memoize(() => {
    if (!mParentContextType) {
      if (Object.keys(mDefs.pendingNames).length > 0)
        { raise('DAST schema failure'); }
      return false;
    }

    if (Object.keys(mDefs.pendingNames).length === 0)
      { return false; }

    if (mDefs.pendingNames[FunctionNamingSchema.kParentName]) {
      // NOTE parent intial setter is created up in body build
      mStage.intoParentBuild(mDefs.name, mParentContextType);
    }

    return true;
  });

  const saveLocalStackPointer = memoize((): FunctionType => {
    return freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit(writer: CodeWriter) {
        writer.forStackPointer('saveToLocal');
        // if such parent exists, we have to have an "initial set" for it
        if (hasParentGetter()) {
          writer.storeParentStackPointer();
        }
        return writer;
      }
    });
  });

  const delegatedFtypes = memoize(() => {
    mapNamesToParents().forEach(([name, parent]) => {

    });
  });

  const ancestorInitialSet = memoize(() => {
    // make a tuple of ancestors - immediate parent (ObjectType[])
    // have a set of variable names based on those ancestors
    // 
    mStage.intoInitialSetBuild();
  });
  const increasinglyDeepAncestorTypes = memoize((): Readonly<ObjectType[]> => {

  });

  const mapNamesToParents = memoize((): [string, ObjectType][] => {
    if (Object.keys(mDefs.pendingNames).length === 0)
      { return []; }

    for (const name in mDefs.pendingNames) {
      if (name === FunctionNamingSchema.kParentName)
        { continue; }
      // let's focus on what we need here first, then make whatever supporting thing we need we write it
      const foundIn: ObjectType = mStackThing.findWhereDeclared(name);
      return [[name, foundIn]];
    }
  });

  const preface = memoize((): FunctionType => {
    
    saveLocalStackPointer();
    // make a call on context for initial set of ancestors whose arguments are a special tuple that produces correct SP values
    

    const getParent = mStage.intoObjectType().
      lookUp(FunctionNamingSchema.kParentName)?.
      byParameters(TupleObjectFactory.emptyTuple());

    // Make a tuple ftype to load ancestors on to the stack

    increasinglyDeepAncestorTypes().forEach((ancestorType: ObjectType) => {
      if (!hasParentGetter())
        { raise('need parent'); }
      getParent?.emit;
      // set SP
      function emit(writer: CodeWriter) {
        // load up that ancestor (keep on stack for initial setter)
      }
      
    });

    // call that initial setter
    ancestorInitialSet();
  });

  const contextType = memoize((): ObjectType | undefined => {
    // before hitting declared names make sure we have the basics
    // (parents and puts)
    addPuts() && preface();
    const contextObjectType = mStage.intoObjectType;
    for (const functionName in mDefs.declaredNames) {
      const decl = mDefs.declaredNames[functionName];

      const newStage = mHoldAsContextType(contextObjectType, () => {
        const build = mIntoFTypeBuild(decl.value);
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
      mStage = newStage;
    }
    return mStage.intoObjectType();
  });

  return freeze({
    info: memoize((): ContextInfo | undefined => {
      if (!contextType() || !preface())
        { return undefined; }
      return freeze({
        contextType: contextType as () => ObjectType,
        preface
      });
    }),
    error
  });
}

export const ContextBuild = freeze({ make });
