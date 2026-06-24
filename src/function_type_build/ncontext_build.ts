import { ObjectType } from '../function_type_build';

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

interface ContextSnapshotN {
  contains(pendingName: string): boolean;
  referenceType(): ObjectType;
  // name?
  // contextType? this should not be exposed here
};

interface ContextFrameStack {};
// protoype for context type
interface ContextTypeAncestorBase {
  // no reference type (should not be needed yet)
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