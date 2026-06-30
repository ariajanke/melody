import { DastFunctionNameMappings, DastNode } from '../dast_build';
import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers } from '../helpers';
import { DeclaredContextStack } from './declared_context_stack';
import { UsedAncestorCollection } from './used_ancestor_collection';

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

const { freeze } = Helpers;

interface ContextSnapshotN {
  contains(pendingName: string): boolean;
  referenceType(): ObjectType;
  // name?
  // contextType? this should not be exposed here
};

// interface ContextFrameStack {
//   findWhereDeclared(pendingName: string): ObjectType;
//   hopCountFor(pendingName: string): number;
//   contextForHop(idx: number): ContextSnapshotN | undefined;
// };

// What if you took your observed friction here, and turn that
// into a basis for SLM use? (Since I can't really afford LLMs atm)

interface ContextBaseBuild {
  
  // always one pointer in size
  referenceType(): ObjectType;
  // reuse: UsedAncestorCollection

  // preface: is a changing thing throughout link builds

};

// Why? My anhedonia, one day I'll escape

const ContextBaseBuild = freeze({
  make(mDefs: DastFunctionNameMappings,
       mUsedAncestorCollection: UsedAncestorCollection,
       mIntoFTypeBuild: (dnode: DastNode) => FunctionTypeBuild,
       mFrameStack: DeclaredContextStack)
  {
    // scope: this replaces "stage" specifically
    // add puts

  }
});

interface ContextLinkBuild {
  referenceType(): ObjectType;
  // aggregateType(): ObjectType; not sure if needed

  // preface builder: I need the current frame reference context type 
  preface(): FunctionType;
};
const ContextLinkBuild = freeze({
  // we can enforce sequencing like this:
  make(mBaseBuild: ContextBaseBuild,
       mUsedAncestorCollection: UsedAncestorCollection
  ) {}
  // or at least pass in the products of the previous step
})

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