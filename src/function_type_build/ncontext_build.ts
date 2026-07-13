import { BuiltinFunctionNames } from '../builtin_function_names';
import { DastDeclarationMap, DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError, StandardErrorMessage, raise } from '../helpers';
import { DeclaredContextStack } from './declared_context_stack';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { AncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';
import { CodeWriter  } from '../code_writer';
import { TupleObjectFactory } from './tuple_type';
import { ObjectTypeBuild } from './context_attribute_build';
import { BuiltinTypeBase } from './builtin_type';
import { MemoryArray } from '../memory_array';
import { FunctionBodyPrefaceBuild } from './function_body_preface_build';
import { ContextAttributeFactory } from './context_attribute_factory';

// We conceptualize the preface ftype as an initial setter
// There's setting the parent pointer, and then the ancestors
// For a proper ftype I need the object type for the pointers.
// These are just "references", which are fully knowable and freezable.
// ContextTypes are references by definition, because of how accessors and
// modifiers are defined.
// So it's not out of line to just pass whole ObjectType(s)

// I want to get rid of the "holder" concept entirely (for this context).
// Just have the declared stack and it's stack of reference (pointer) types.

// So when recurring, we want something more stripped down.
// Some kind of "container" so we can check if something is defined.
// Have some kind of way to key into the reference type itself.

// Variable layout of a frame:
// parent
// n ancestors
// m variables (declared names)

const { freeze, memoize } = Helpers;

interface ContextSnapshotN {
  contains(pendingName: string): boolean;
  referenceType(): ObjectType;
  uniqueName(): string;
  // name?
  // contextType? this should not be exposed here
};

interface ContextFrameStack {
  findWhereDeclared(pendingName: string): ObjectType;
  hopCountFor(pendingName: string): number;
  contextForHop(idx: number): ContextSnapshotN | undefined;
};

const ContextFrameStack = freeze({
  kHopsToParent: 0
});

interface WritableContextFrameStack {
  withBaseReferenceType(contextReferenceType: ObjectType, fn: () => void): void;
};


// What if you took your observed friction here, and turn that
// into a basis for SLM use? (Since I can't really afford LLMs atm)

interface ContextBaseBuild {
  referenceType(): ObjectType;
  contextLinkBuild(mUsedAncestorCollection: UsedAncestorCollection): ContextLinkBuild;
};

// Why? My anhedonia, one day I'll escape
// Order brings me pleasure.
//
// What's the relationship between receiver and a typical member function?
// In a call, we do not have a notion that any particular receiver is mounted.
// Fringes don't appear to explicitly mount the receiver.
// - Consequence: they have a "none" receiver
// - These "base cases" for call trees where the "receive, args, call"
//   routine stops
//
// I want to:
// - clear up receiver and calls relationship
// - replace "stage"
// - get rid of "<context>" nodes in the DAST, possibly replacing it with "none"

type FunctionOpLookUp =
  { [op: string | symbol]: FunctionLookUpTable | undefined };

/// A ContextBaseCreation is the first, prototype stage for creating a stack
/// frame's reference type.
const ContextBaseBuild = freeze({
  make(): ContextBaseBuild {
    // scope: this replaces "stage" specifically
    // add puts
    const mTable: FunctionOpLookUp = {};
    const { emptyTuple } = TupleObjectFactory;
    const addPuts = ((): FunctionLookUpTable =>
      mTable[BuiltinFunctionNames.kPuts] = PutsFunctionLookUpTable.instance());

    const addContext = ((): MutableFunctionTable =>
      mTable[FunctionNamingSchema.kContextName] = MutableFunctionTable.
        make().setDefinition(emptyTuple(), referenceGetter()));

    const addNone = ((): MutableFunctionTable =>
      mTable[FunctionNamingSchema.kNoneName] = MutableFunctionTable.
        make().setDefinition(emptyTuple(), noneGetter()));

    const referenceGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.makeDefaults(),
      returns: () => referenceType(),
      simpleEmit(codeWriter: CodeWriter) {
        return codeWriter.pushStackPointer();
      }
    }));

    const noneGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.makeDefaults(),
      simpleEmit(_0: CodeWriter) {}
    }));

    const referenceType = memoize((): ObjectType => {
      const inst = freeze({
        ...BuiltinTypeBase.defaultsWith((): ObjectType => inst),
        name: () => 'ContextType',
        lookUp(operation: string | symbol): FunctionLookUpTable | undefined
          { return mTable[operation]; },
        // NOTE: Just a pointer for the reference type.
        sizeInBytes: () => MemoryArray.kWordSizeInBytes,
        sizeInStackItems: () => 1
      });
      return addPuts() && addContext() && addNone() && inst;
    });

    return freeze({
      referenceType,
      contextLinkBuild: ((mUsedAncestorCollection: UsedAncestorCollection,
        mFrameStack: ContextFrameStack
      ) =>
        ContextLinkBuild.make( mUsedAncestorCollection, mFrameStack, referenceType(), mTable,  ))
      // some method about constructing the next phase...
    })
  }
});

interface ReceiverResolution {
  mapExpectedToReceiverAccessor:
    (expectedReceiver: ObjectType) =>
    // will always have "Tuple()" as the expected receiver
    // returning undefined would mean here: can't identify proper receiver error
    FunctionType | undefined;
};

/// The ReceiverResolution tells the current context which receiver ought be
/// used, when the code does not make it explicit.
const ReceiverResolution = freeze({
  make(mUsedAncestorCollection: UsedAncestorCollection,
       mReferenceType: ObjectType
  ) {
    const mReceiverResolutionTable: { [uid: symbol]: FunctionType | undefined } = {};
    const { emptyTuple } = TupleObjectFactory;

    function addToTable(receiverType: ObjectType, name: string): FunctionType {
      const ftype = mReferenceType.
        lookUp(name)?.
        byParameters(emptyTuple());
      if (!ftype) {
        raise(`Failed lookup of "${name}", was not added to stack frame's type`);
      } else if (ftype.receiver().uid() !== emptyTuple().uid()) {
        raise('All receiver accessors must have "Tuple()" as the expected receiver');
      }
      return mReceiverResolutionTable[receiverType.uid()] = ftype;
    }

    const { kNoneName, kContextName, kParentName } = FunctionNamingSchema;
    const addBaseReceivers = () =>
      addToTable(emptyTuple(), kNoneName) && 
      addToTable(mReferenceType, kContextName);

    // NOTE absence is not evidence of an error
    function addParent(): FunctionType | undefined {
      addBaseReceivers();

      const { hasParentGetter } = mUsedAncestorCollection;

      if (hasParentGetter()) {
        const parentInfo: ContextSnapshotN = memoize(() => mFrameStack.
          contextForHop(ContextFrameStack.kHopsToParent));
        return addToTable(parentInfo!.referenceType(), kParentName) &&
               addToTable(parentInfo!.referenceType(), parentInfo!.uniqueName());
        
      }

      return undefined;
    }

    // NOTE absence is not evidence of an error
    const addAncestors = memoize((): FunctionType | undefined =>
      mUsedAncestorCollection.ancestors().reduce((prev: FunctionType | undefined, ancInfo: AncestorInfo) => {
        const accName = FunctionNamingSchema.mapToFringeAccessor(ancInfo.variableName);
        return prev && addToTable(ancInfo.type, accName);
      }, addParent()));

    const mapExpectedToReceiverAccessor = (expectedReceiver: ObjectType) => {
      addAncestors();
      return mReceiverResolutionTable[expectedReceiver.uid()];
    };

    return freeze({ mapExpectedToReceiverAccessor });
  }
})

// Proposed redefinition:
// Context means "the implicit receiver"
// And the current stack frame type, is just that, the StackFrame type

/// A ContextLinkCreation is the second stage, where the current stack frame's
/// ancestors are incorperated which sets initial behavior.
interface ContextLinkBuild {
  referenceType(): ObjectType;

  // preface builder: I need the current frame reference context type 
  preface(): FunctionType;

  next(): ContextDelegationBuild;
};

// I'm still really not sure how I want to do this
interface WritableVariableOffset {
  type: ObjectType;
  accessIndex: number;
};

type VariableOffset = Readonly<WritableVariableOffset>;

export interface VariableAllocation {
  lookUp(name: string): VariableOffset | undefined;
  lookUpTuple(names: readonly string[]): VariableOffset | undefined;
  next(name: string, objectType: ObjectType): VariableAllocation;
  talliedSizeInBytes(): number;
  talliedSizeInItems(): number;
};

// kind of ugly tbh
type VarAllocState = {
  mVarTable: { [name: string]: VariableOffset };
  mByteCount: number;
  mItemCount: number;
};

const VariableAllocation = freeze({
  make(mNextName?: string,
       mNextObjectType?: ObjectType,
       mPriv?: VarAllocState,
       mPrev?: VariableAllocation)
    : VariableAllocation
  {
    if ((mNextName === undefined) !==
        (mNextObjectType === undefined))
    {
      raise('Either next name and next type are both defined or not');
    }
    const kJoinChar = ',';
    function assertNextNameOk(name?: string) {
      if (name === undefined)
        { return; }
      if (mNextName?.indexOf(kJoinChar) === -1)
        { return; }
      raise(`Name '${name}' may not contain '${kJoinChar}'`);
    }
    assertNextNameOk(mNextName);
    
    const { mByteCount, mVarTable, mItemCount } =
      (mPriv ??= ({
        mByteCount: mNextObjectType?.sizeInBytes() ?? 0,
        mVarTable: {},
        mItemCount: mNextObjectType?.sizeInStackItems() ?? 0
      }));
    if (mNextName) {
      if (mVarTable[mNextName]) {
        raise(`Name '${mNextName}' already reserved.`);
      }
      mVarTable[mNextName] = freeze({
        accessIndex: mByteCount - mNextObjectType!.sizeInBytes(),
        type: mNextObjectType!
      });
    }
    
    const inst: VariableAllocation = mPrev ?? freeze({
      lookUpTuple(names: readonly string[]): VariableOffset | undefined {
        if (names.length === 0) {
          raise('there must be at least one name in a valid tuple name set');
        }
        const joinedNames = names.join(',');
        const found = mVarTable[joinedNames];
        if (found)
          { return found; }
        const lookUps = names.map(name => inst.lookUp(name));
        if (lookUps.some(value => value === undefined))
          { return undefined; }
        type TupleCheck = number | 'not ok' | 'started';
        const accessIndex = lookUps[0]!.accessIndex;
        const tupleOkay = lookUps.reduce((prevIdx: TupleCheck, lookUp: VariableOffset | undefined) => {
          if (prevIdx === 'not ok')
            { return prevIdx; }
          const size = lookUp!.type.sizeInStackItems();
          const next = lookUp!.accessIndex + size;
          if (prevIdx === 'started') {
            return next;
          } else if ((next - prevIdx) === size) {
            return next;
          }
          return 'not ok';
        }, 'started' as TupleCheck);
        if (!tupleOkay)
          { return undefined; }
        const rv = freeze({
          accessIndex,
          type: TupleObjectFactory.make(lookUps.map(lookUp => lookUp!.type))
        });
        mVarTable[joinedNames] = rv;
        return rv;
      },
      lookUp(name: string): VariableOffset | undefined
        { return mVarTable[name]; },
      next(name: string, objectType: ObjectType): VariableAllocation {
        const rv = VariableAllocation.make(name, objectType, mPriv, inst);
        mPriv = undefined;
        return rv;
      },
      talliedSizeInBytes: (): number => mByteCount,
      talliedSizeInItems: (): number => mItemCount
    });
    return inst;
  }
})

const ContextLinkBuild = freeze({
  // we can enforce sequencing like this:
  make(//mUsedAncestorCollection: UsedAncestorCollection,
       mPendingNames: Readonly<{ [name: string]: true }>,
       mFrameStack: ContextFrameStack,
       // this belongs to the current (context) reference type
       mReferenceType: ObjectType,
       mReferenceTypeLookUpTable: FunctionOpLookUp = {}
  ): ContextLinkBuild
  {
    const mUsedAncestorCollection = UsedAncestorCollection.
      make(mFrameStack, mPendingNames);
    const { hasParentGetter } = mUsedAncestorCollection;
    ReceiverResolution.make(mUsedAncestorCollection, mReferenceType);

    const variableAllocation = memoize((): VariableAllocation => {
      if (!hasParentGetter())
        { return VariableAllocation.make(); }
      const parentContextSnapshot = mFrameStack.
        contextForHop(ContextFrameStack.kHopsToParent);
      if (!parentContextSnapshot) {
        raise('Used ancestor collection contains direct parent for an empty ' +
              'context stack.');
      }
      const varAlc = VariableAllocation.
        make(FunctionNamingSchema.kParentName,
             parentContextSnapshot.referenceType());
      return mUsedAncestorCollection.
        ancestors().
        reduce((varAlc: VariableAllocation, anc: AncestorInfo) =>
                varAlc.next(anc.variableName, anc.type), varAlc);
    });
    const prefaceBuild = FunctionBodyPrefaceBuild.
      make(variableAllocation(), mUsedAncestorCollection, mReferenceType, mReferenceTypeLookUpTable);

    const preface = memoize(() =>
      prefaceBuild.addAncestorAccessors() && prefaceBuild.functionType());
    // TODO define accessors, and preface

    return freeze({
      referenceType: (): ObjectType => mReferenceType,

      preface,

      next(mPendingNames: { [name: string]: true }): ContextDelegationBuild {

        const buildDeclarationThings = (mDeclarationsMap: DastDeclarationMap,
          mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild
        ): ContextDeclarationBuild => {
          return ContextDeclarationBuild.
            make(variableAllocation(),
                 mReferenceTypeLookUpTable,
                 mDeclarationsMap,
                 mIntoFunctionTypeBuild);
        };
        preface();
        return ContextDelegationBuild.
          make(mPendingNames,
               mReferenceTypeLookUpTable,
               mFrameStack,
               buildDeclarationThings);
      }
    })
  }
});

interface ContextDelegationBuild {
  referenceType(): ObjectType;
  next(): ContextDeclarationBuild;
};
// const ContextDelegationFunctionType = freeze({
//   make(mName: string,
//        mFrameStack: ContextFrameStack,
//        mDelegateeType: ObjectType,
       
//   ): FunctionTypeBuild {
    
//     const { mapToFringeAccessor } = FunctionNamingSchema;
//     const snapshot = () =>
//       mFrameStack.contextForHop(mFrameStack.hopCountFor(mName));
//     // const accessorTable = () =>
//     //   mDelegateeType.lookUp(mName) ??
//     //   mDelegateeType.lookUp(mapToFringeAccessor(mName));
//     // const ancestorAccessor = memoize(() => accessorTable()?.byParameters
//     snapshot()?.referenceType()?.lookUp(mName);
//   }
// });

const ContextDelegationBuild = freeze({
  make(mPendingNames: { [name: string]: true },
       mReferenceTypeLookUpTable: FunctionOpLookUp,
       mFrameStack: ContextFrameStack,
       mReferenceType: ObjectType,
       mMakeDeclarationBuild: () => ContextDeclarationBuild
  ) {
    // delegation is easy I think
    // since we have ancestors, receiver resolution semantics, we could
    // probably just copy-paste them over
    function lookUpName(name: string): FunctionLookUpTable {
      const snapshot = mFrameStack.contextForHop(mFrameStack.hopCountFor(name));
      return snapshot?.referenceType()?.lookUp(name) ??
             raise(`Could find pending name '${name}'`);
    }

    const referenceType = memoize(() => {
      // yes really that simple
      // receiver resolution should take care of the rest
      for (const name in mPendingNames) {
        mReferenceTypeLookUpTable[name] = lookUpName(name);
      }

      return mReferenceType;
    });


    const next = () =>
      referenceType() && mMakeDeclarationBuild();

    return freeze({
      referenceType,
      next
    });
  }
});

// this does have an error state, because this builds nodes into ftypes
interface ContextDeclarationBuild {
  // make our cache explicit
  // cachedBuildFor(node: DastNode): FunctionTypeBuild;

  referenceType(): ObjectType | undefined;
  // we do need the aggregate type for indirect calls...
  aggregateType(): ObjectType | undefined;

  error(): StandardErrorMessage;
};

interface DeclarationValuesMapBuild {
  /// NOTE if this returns, then all subsequent builds are successful
  valueToBuildCacheFunction(): ((node: DastNode) => FunctionTypeBuild | undefined) | undefined;
  error(): StandardErrorMessage;
}

interface DeclarationsBuildOrder {
  buildsInOrder(): Readonly<FunctionTypeBuild[]>;
  mapDastToBuild(node: DastNode): FunctionTypeBuild | undefined;
};

const DeclarationsBuildOrder = freeze({
  make(
    mDeclarationsMap: DastDeclarationMap,
    mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : DeclarationsBuildOrder
  {
    const mDastSet: { [dastUid: number]: FunctionTypeBuild } = {};
    const mFtypeBuildOrder: FunctionTypeBuild[] = [];

    function addFtypeBuildOnceFor(node: DastNode) {
      const build = mIntoFunctionTypeBuild(node);
      if (mDastSet[node.uid()])
        { return; }
      mDastSet[node.uid()] = build;
      mFtypeBuildOrder.push(build);
    }

    const varNameToDependees = memoize(() => {
      const varNameToDependees_: { [name: string]: { dependeeNames: Readonly<string[]>; value: DastNode; } } = {};
      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        if (decl.initialSet === undefined)
          { continue; }
        const { variableNames, dependeeNames } = decl.initialSet;
        variableNames.forEach((name: string) => {
          varNameToDependees_[name] = { dependeeNames, value: decl.value };
        }); 
      }
      return varNameToDependees_;
    });

    function doName(name: string): void {
      const { dependeeNames, value } = varNameToDependees()[name];
      dependeeNames.forEach(doName);
      addFtypeBuildOnceFor(value);
    }

    function iterateVarNames() {
      for (const name in varNameToDependees()) {
        doName(name);
      }
    }

    const inst = freeze({
      buildsInOrder: memoize((): Readonly<FunctionTypeBuild[]> => {
        iterateVarNames();
        return mFtypeBuildOrder;
      }),
      mapDastToBuild(node: DastNode): FunctionTypeBuild | undefined {
        inst.buildsInOrder();
        return mDastSet[node.uid()];
      }
    });
    return inst;
  }
});

const DeclarationValuesMapBuild = freeze({
  make(mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
    : DeclarationValuesMapBuild
  {
    const { setErrorFn, error } = StandardError.make();

    // const mBuildCache: { [dastUid: number]: FunctionTypeBuild | undefined } = {};
    // const declarationValueBuildsInOrder = memoize(() =>
    //   setDeclarationBuildsInOrder(mDeclarationsMap, mIntoFunctionTypeBuild));
    const { buildsInOrder, mapDastToBuild } = DeclarationsBuildOrder.
      make(mDeclarationsMap, mIntoFunctionTypeBuild);
    const failedBuild = memoize(() =>
      buildsInOrder().
      reduce((prev: FunctionTypeBuild | undefined, build: FunctionTypeBuild) => {
        if (prev)
          { return prev; }

        if (build.functionType())
          { return undefined; }

        return build;
      }, undefined));

    const valueToBuildCacheFunction = memoize(() => {
      const fbuild = failedBuild();
      if (fbuild) {
        return setErrorFn(fbuild.error);
      }

      return mapDastToBuild;
    });

    return freeze({ valueToBuildCacheFunction, error })
  }
});

interface DeclarationVariableAllocation {
  variableAllocation(): VariableAllocation;

};

const DeclarationVariableAllocation = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReturnValueOfNode: (node: DastNode) => ObjectType,
       mDeclarationsMap: DastDeclarationMap
  )
    : DeclarationVariableAllocation
  {
    function upto<T>(i: number, n: number, withT: T, fn: (i: number, t: T) => T) {
      if (n < 0)
        { raise(`Index must be a non-negative integer`); }
      return upto(i + 1, n, fn(i, withT), fn);
    }

    function allocateForNames(varAlloc: VariableAllocation, names: Readonly<string[]>, node: DastNode) {
      const varType = mReturnValueOfNode(node);
      const types = names.length > 1 ? varType.detuplify() : [varType];
      if (!types)
        { raise('multiple names for non tuple'); }
      if (types.length !== names.length) {
        raise('oh no');
      }
      return upto(0, types.length, varAlloc, (idx: number, varAlloc: VariableAllocation) => {
        return varAlloc.next(names[idx], types[idx]);
      });
    }
    const variableAllocation = memoize(() =>
      Object.
        keys(mDeclarationsMap).
        reduce((prev: VariableAllocation, name: string) => {
          const decl = mDeclarationsMap[name];
          if (!decl.initialSet)
            { return prev; }
          return allocateForNames(prev, decl.initialSet.variableNames, decl.value);
        }, mVariableAllocation));
    return freeze({ variableAllocation });
  }
});

const ContextDeclarationBuild = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReferenceTypeLookUpTable: FunctionOpLookUp,
       mDeclarationsMap: DastDeclarationMap,
       mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild,
       mReferenceType: ObjectType
  ): ContextDeclarationBuild
  {
    const { error, setErrorFn } = StandardError.make();
    // declaration value ftypes, build in order, if that mapper ain't there
    // it failed
    const valuesMapBuild = DeclarationValuesMapBuild.
      make(mDeclarationsMap, mIntoFunctionTypeBuild);

    const returnTypeOf = memoize(() => {
      const toBuild = valuesMapBuild.valueToBuildCacheFunction();
      if (!toBuild)
        { return setErrorFn(valuesMapBuild.error); }

      return (node: DastNode) =>
        toBuild(node)?.functionType()?.returns() ??
          raise('');
    });

    const fullVariableAllocation = memoize(() => {
      const rtOf = returnTypeOf();
      if (!rtOf)
        { return undefined; }

      return DeclarationVariableAllocation.
        make(mVariableAllocation, rtOf, mDeclarationsMap).
        variableAllocation();
    });

    // need to add the rest of the variables
    

    // need to add the rest of the accessors/modifiers/initial sets
    function addContextFunctions() {
      const varAlloc = fullVariableAllocation();

      if (!varAlloc) 
        { return undefined; }

      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        if (decl.accessor) {
          const varInfo = varAlloc.lookUp(decl.accessor.variableName);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildGetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(TupleObjectFactory.emptyTuple(), ftype);
        }
        if (decl.assignment) {
          const varInfo = varAlloc.lookUp(decl.assignment.variableName);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildSetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(varInfo.type, ftype);
        }
        if (decl.initialSet) {
          const varInfo = varAlloc.lookUp(decl.initialSet.);
          if (!varInfo) { raise('oh no!'); }
          const ftype = ContextAttributeFactory.
            buildSetter(varInfo.accessIndex, varInfo.type);
          mReferenceTypeLookUpTable[name] = MutableFunctionTable.make().
            setDefinition(varInfo.type, ftype);
        }
      }
    }

    // what's the aggregate type?
    // pretty simple, we're not throwing aggregates around atm
    // this is essentially just for the ftype call builds
    const aggregateType = memoize((): ObjectType | undefined => {
      if (!fullVariableAllocation())
        { return undefined; }

      return freeze({
        name: () => 'AggregateContext',
        lookUp: (_0: string | symbol) => undefined,
        detuplify: () => undefined,
        uid: memoize(Symbol),
        sizeInBytes: fullVariableAllocation()!.talliedSizeInBytes,
        sizeInStackItems: fullVariableAllocation()!.talliedSizeInItems
      });
    });

    const referenceType = memoize((): ObjectType | undefined => {
      if (!fullVariableAllocation())
        { return undefined; }

      addContextFunctions();
      return mReferenceType;
    })

    return freeze({ referenceType, aggregateType, error });
  }
})

// after that
// it's grab the preface
// build the lines
// combine
// clean up
// then done
