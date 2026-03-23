import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { Helpers, StandardError, StandardErrorMessage, raise } from '../helpers';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { ContextBuildPerDeclaration } from './context_build_per_declaration';
import { ContextFactoryStage } from './context_factory_stage';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { TupleObjectFactory } from './tuple_type';
import { DeclaredContextStack } from './declared_context_stack';
import { MutableFunctionTable } from './mutable_function_table';
import { BuiltinFunctionNames } from '../builtin_function_names';
import { StackSafetyChecker } from './stack_safety_checker';
import { AncestorInfo, ExtendedAncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';

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
  const parentContextSnapshot = memoize(() =>
    mStackThing.contextForHop(1));
  const hasParentGetter = memoize(() => {
    if (!parentContextSnapshot()) {
      if (Object.keys(mDefs.pendingNames).length > 0)
        { raise('DAST schema failure'); }
      return false;
    }

    if (Object.keys(mDefs.pendingNames).length === 0)
      { return false; }

    if (mDefs.pendingNames[FunctionNamingSchema.kParentName]) {
      const { name, contextType } = parentContextSnapshot()!;
      mStage.intoParentBuild(name(), contextType());
    }

    return true;
  });

  const parentGetter = memoize(() => {
    if (!hasParentGetter())
      { return undefined; }
    return mStage.intoObjectType().
      lookUp(FunctionNamingSchema.kParentName)?.
      byParameters(TupleObjectFactory.emptyTuple());
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
    // v make sure these are defined first
    ancestorAccessors();
    // okay delegations...
    // need SP adjustment for loads/stores
    // need receiver adjustment for calls
    for (const pendingName in mDefs.pendingNames) {
      if (pendingName === FunctionNamingSchema.kParentName)
        { continue; }
      const snapshot = mStackThing.contextForHop(mStackThing.hopCountFor(pendingName))!;
      
      const ancestorAccessor = (mStage.intoObjectType().
        lookUp(snapshot.name()) ??
        // :(
        mStage.intoObjectType().lookUp(FunctionNamingSchema.mapToFringeAccessor(snapshot.name()))
      )?.
        byParameters(TupleObjectFactory.emptyTuple());
      if (!ancestorAccessor) {
        raise(`Missing ancestor accessor for "${pendingName}" ` +
              `in context "${snapshot.name()}"`);
      }
      snapshot.contextType().lookUp(pendingName)?.list().forEach(ft => {
        const delegationFunctionType: FunctionType = freeze({
          // this only works for plan functions?
          // what about accessors, modifiers, initial sets?
          alternateReceiver: () => snapshot.name(),
          parameters: ft.parameters,
          returns: ft.returns,
          emit(writer: CodeWriter) {
            ancestorAccessor.emit(writer);
            writer.setStackPointer();

            ft.emit(writer);

            writer.forStackPointer('restoreToGlobal');
          },
          uid: memoize(Symbol)
        });
        const lookUp = MutableFunctionTable.make().setDefinition(ft.parameters(), delegationFunctionType);
        mStage.intoDirectLookUp(pendingName, lookUp);
      });
    }
  });

  const ancestorAccessors = memoize((): Readonly<FunctionType[]> => {
    if (!parentGetter())
      { return []; }    
    return mUsedAncestorCollection.ancestors().map((info: AncestorInfo) => {
      // accessors are harder, because the current build structure is built around the notion of tuples
      // seems highly irregular, but that's what we're doing with parent?
      const accessorName = FunctionNamingSchema.
        mapToFringeAccessor(info.variableName);
      const build = mStage.
        intoAccessorBuild(accessorName, info, info.type);
      if (!build.functionType()) {
        raise(`Ancestor accessor "${accessorName}" failed to build: ` +
              `"${build.error().message}"`);
      }
      return build.functionType()!;
    });
  });

  // Total set, leaves everything cleaned up
  const ancestorInitialSet = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }
    const names = mUsedAncestorCollection.ancestorNames();
    const iSName = FunctionNamingSchema.mapToInitialSetName(names);
    const build = mStage.
      intoInitialSetBuild(iSName, names, mUsedAncestorCollection.ancestorTupleType());
    if (!build.functionType()) {
      raise(`Ancestor initial set unexpectedly failed to build: ` +
            `"${build.error().message}"`);
    }

    return freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit: (writer: CodeWriter) => {
        ancestorTupleEmission().emit(writer);
        build.functionType()!.emit(writer);
        return writer;
      }
    });
  });

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }

    const ancs = mUsedAncestorCollection.allAncestors(); // increasinglyDeepAncestorTypes();
    if (ancs.length === 0) {
      return freeze({
        ...FunctionTypeBase.receivedByContext(),
        emit: (writer: CodeWriter) => writer,
        returns: TupleObjectFactory.emptyTuple
      });
    }
    const hopEmissions = ancs.
      map((info: ExtendedAncestorInfo) =>
      (writer: CodeWriter): void => {
        // NOTE current SP is set to this context! So calling this parent
        //      getter is a no brainer!
        info.type.
          lookUp(FunctionNamingSchema.kParentName)?.
          byParameters(TupleObjectFactory.emptyTuple())!.
          emit(writer);
        if (info.use === 'used') {
          writer.duplicateTop();
        }
        writer.setStackPointer();
      });
    StackSafetyChecker.make().check( parentGetter()! );
    const ftype = freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit: (writer: CodeWriter) => {
        parentGetter()!.emit(writer);
        writer.duplicateTop().setStackPointer();
        hopEmissions.forEach(emitHop => emitHop(writer));

        // NOTE SP changed during pointer emision, so reset it
        writer.forStackPointer('restoreToGlobal');
      },
      returns: mUsedAncestorCollection.ancestorTupleType //usedAncestorType,
    });
    StackSafetyChecker.make().check( ftype );
    return ftype;
  });

  const preface = memoize((): FunctionType => {
    return freeze({
      ...FunctionTypeBase.receivedByLexical(),
      emit(writer: CodeWriter) {
        saveLocalStackPointer().emit(writer);
        if (hasParentGetter()) {
          ancestorInitialSet().emit(writer);
        }
        return writer;
      }
    });
  });

  const contextType = memoize((): ObjectType | undefined => {
    // before hitting declared names make sure we have the basics
    // (parents and puts)
    addPuts() && preface() && delegatedFtypes();
    for (const functionName in mDefs.declaredNames) {
      const decl = mDefs.declaredNames[functionName];
      const build = mIntoFTypeBuild(decl.value);
      if (!build.functionType())
        { return setErrorFn(build.error); }

      const declaration = ContextBuildPerDeclaration.
        selectBuildForDeclaration(functionName, decl, build.functionType()!, mStage);
      if (!declaration.functionType()) {
        return setErrorFn(declaration.error);
      }
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
