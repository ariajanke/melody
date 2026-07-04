import { BuiltinFunctionNames } from '../builtin_function_names';
import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionLookUpTable, FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { DeclaredContextStack } from './declared_context_stack';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { UsedAncestorCollection } from './used_ancestor_collection';
import { CodeWriter  } from '../code_writer';
import { TupleObjectFactory } from './tuple_type';
import { ObjectTypeBuild } from './context_attribute_build';
import { BuiltinTypeBase } from './builtin_type';
import { MemoryArray } from '../memory_array';

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
  // name?
  // contextType? this should not be exposed here
};

interface ContextFrameStack {
  findWhereDeclared(pendingName: string): ObjectType;
  hopCountFor(pendingName: string): number;
  contextForHop(idx: number): ContextSnapshotN | undefined;
};

interface WritableContextFrameStack {
  withBaseReferenceType(contextReferenceType: ObjectType, fn: () => void): void;
};


// What if you took your observed friction here, and turn that
// into a basis for SLM use? (Since I can't really afford LLMs atm)

interface ContextBaseBuild {
  
  // always one pointer in size
  referenceType(): ObjectType;
  // reuse: UsedAncestorCollection

  // preface: is a changing thing throughout link builds

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

const ContextBaseBuild = freeze({
  make() {
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
      ...FunctionTypeBase.receivedByNone(),
      returns: () => referenceType(),
      emit(codeWriter: CodeWriter) {
        return codeWriter.pushStackPointer();
      }
    }));

    const noneGetter = memoize((): FunctionType => freeze({
      ...FunctionTypeBase.receivedByNone(),
      emit(_0: CodeWriter) {}
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
      contextLinkBuild: ((mUsedAncestorCollection: UsedAncestorCollection) =>
        ContextLinkBuild.make( mUsedAncestorCollection, mTable ))
      // some method about constructing the next phase...
    })
  }
});

interface ContextLinkBuild {
  referenceType(): ObjectType;
  

  // preface builder: I need the current frame reference context type 
  preface(): FunctionType;

  sizeInBytes(): number;
  sizeInWords(): number;
};

// I'm still really not sure how I want to do this
// interface WritableVariableOffset {
//   type: ObjectType;
//   accessIndex: number;
// };

// type VariableOffset = Readonly<WritableVariableOffset>;

// interface VariableAllocation {
//   lookUp(name: string): VariableOffset;
//   next(name: string, objectType: ObjectType): VariableAllocation;
//   talliedSizeInBytes(): number;
//   talliedSizeInItems(): number;
// };

// const VariableAllocation = freeze({
//   spentStep: memoize((): VariableAllocation => {

//   }),
//   make(mNextName: string,
//        mNextObjectType: ObjectType,
//        )
// })

const ContextLinkBuild = freeze({
  // we can enforce sequencing like this:
  make(mUsedAncestorCollection: UsedAncestorCollection,
       mTable: FunctionOpLookUp = {}
  )
  {
    
    const sizeInWords = memoize(() => {
      const { ancestorTupleType, hasParentGetter } = mUsedAncestorCollection;
      const wordForParent = hasParentGetter() ? 1 : 0;
      return ancestorTupleType().sizeInStackItems() + wordForParent;
    });

    const sizeInBytes =
      memoize(() => sizeInWords() / MemoryArray.kWordSizeInBytes);

    return freeze({
      sizeInBytes,
      sizeInWords
    })
  }
});

interface ContextDelegationBuild {

};
const ContextDelegationBuild = freeze({
  make(mPendingNames: { [name: string]: true }) {}
})

interface ContextDeclarationBuild {

};

({
  make(mStack: ContextFrameStack, // crawl up on me
       mPendingName: string // string maybe?
  ) {}
})

// create delegates

// we may have to work with incomplete types
// I would like to make that explicit in the code however
// a sub type of ObjectType that has no sizing methods

// create declareds, after which all lookUps should succeed