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
   mParentContextType?: ObjectType,
   mStage = ContextFactoryStage.make())
  : ContextBuild
{
  const { error, setErrorFn } = StandardError.make();

  const addPuts = (() =>
    mStage.intoDirectLookUp(BuiltinFunctionNames.kPuts,
                            PutsFunctionLookUpTable.instance()));
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
      const ancestorAccessor = mStage.intoObjectType().
        lookUp(snapshot.name())?.
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
        const lookUp = MutableFunctionTable.make().setDefinition(snapshot.contextType(), delegationFunctionType);
        mStage.intoDirectLookUp(pendingName, lookUp);
      });
    }
  });

  const ancestorAccessors = memoize((): Readonly<FunctionType[]> => {
    if (!parentGetter())
      { return []; }
    return usedAncestorInfos().map((info: AncestorInfo) => {
      // accessors are harder, because the current build structure is built around the notion of tuples
      const { name } = info;
      const accessorName = FunctionNamingSchema.mapToFringeAccessor(name);
      const build = mStage.
        intoAccessorBuild(accessorName, { variableName: name }, info.type);
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
    const names = usedAncestorAsNames();
    const iSName = FunctionNamingSchema.mapToInitialSetName(names);
    const build = mStage.intoInitialSetBuild(iSName, names, usedAncestorType());
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

  const usedAncestorInfos = memoize((): Readonly<AncestorInfo[]> =>
    increasinglyDeepAncestorTypes().
      filter((info: AncestorInfo) => info.use === 'used'));
  const usedAncestorTypes = memoize((): Readonly<ObjectType[]> =>
    usedAncestorInfos().map(info => info.type));
  const usedAncestorAsNames = memoize((): Readonly<string[]> =>
    usedAncestorInfos().map(info => info.name));
  const usedAncestorType = memoize((): ObjectType =>
    TupleObjectFactory.make(usedAncestorTypes()));

  const ancestorTupleEmission = memoize((): FunctionType => {
    if (!parentGetter())
      { raise('need parent'); }

    const ancs = increasinglyDeepAncestorTypes();
    const lastAncsUid = ancs[ancs.length - 1].type.uid();
    const hopEmissions = ancs.
      map((info: AncestorInfo) =>
      (writer: CodeWriter) => {
        // NOTE current SP is set to this context! So calling this parent
        //      getter is a no brainer!
        info.type.
          lookUp(FunctionNamingSchema.kParentName)?.
          byParameters(TupleObjectFactory.emptyTuple())!.
          emit(writer);
        if (info.use === 'used' && info.type.uid() !== lastAncsUid) {
          writer.duplicateTop();
        }
        writer.setStackPointer();
      });

    return freeze({
      ...FunctionTypeBase.receivedByContext(),
      emit: (writer: CodeWriter) => {
        parentGetter()!.emit(writer);
        writer.duplicateTop().setStackPointer();
        hopEmissions.forEach(emitHop => emitHop(writer));

        // NOTE SP changed during pointer emision, so reset it
        writer.forStackPointer('restoreToGlobal');
      },
      returns: usedAncestorType,
    });
  });

  // [['used', grand parent], ['unused', great grand parent], ...]
  // and *every* parent up the chain, so hops are predictable here
  // if we don't need a specific ancestor, we just omit it from our built tuple (on the WASM stack)
  interface AncestorInfo {
    use: 'used' | 'unused';
    type: ObjectType;
    name: string;
  };
  const increasinglyDeepAncestorTypes = memoize((): Readonly<AncestorInfo[]> => {
    const found: { [hops: number]: ObjectType | undefined } = {};
    mapNamesToParents().forEach(([name, parent]: [string, ObjectType]) => {
      if (parent.uid() === mParentContextType?.uid()) {
        return;
      }
      found[mStackThing.hopCountFor(name)] = parent;
    });

    const result: AncestorInfo[] = [];
    // NOTE skip the current context, and immediate parent
    for (let i = 2; ; ++i) {
      const snapshot = mStackThing.contextForHop(i);
      if (!snapshot)
        { break; }
      const { referenceType, name } = snapshot;
      const use = found[i] ? 'used' : 'unused';
      result.push({ use, type: referenceType(), name: name() });
    }
    return result;
  });

  const mapNamesToParents = memoize((): [string, ObjectType][] => {
    if (Object.keys(mDefs.pendingNames).length === 0)
      { return []; }

    const found: [string, ObjectType][] = [];
    for (const name in mDefs.pendingNames) {
      if (name === FunctionNamingSchema.kParentName)
        { continue; }
      // let's focus on what we need here first, then make whatever supporting thing we need we write it
      const foundIn: ObjectType = mStackThing.findWhereDeclared(name);
      found.push([name, foundIn]);
    }
    return found;
  });

  const preface = memoize((): FunctionType => {
    return freeze({
      ...FunctionTypeBase.receivedByContext(),
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
