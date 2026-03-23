import { DastDeclarationMap, DastNode } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { FunctionTypeBuild, ObjectType } from '../function_type_build';
import {
  Helpers,
  StandardError,
  StandardErrorMessage,
  raise
} from '../helpers';
import { DeclaredContextStack } from './declared_context_stack';
import { AncestorInfo, UsedAncestorCollection } from './used_ancestor_collection';

const { freeze, memoize } = Helpers;

export interface ContextLayoutEntry {
  type: ObjectType;
  accessIndex: number;
};

type WritableContextLayoutMap = { [name: string]: ContextLayoutEntry | undefined };

export interface ContextLayoutEntryMap {
  [name: string]: ContextLayoutEntry;
};

export interface ContextLayout {
  entries(): ContextLayoutEntryMap;
  sizeInBytes(): number;
  sizeInItems(): number;
}

export interface ContextLayoutBuild {
  layout(): ContextLayout | undefined;
  error(): StandardErrorMessage;
};

function make
  (//mDeclaredNames: DastDeclarationMap,
   mUsedAncestorCollection: UsedAncestorCollection,
   mDeclaredContextStack: DeclaredContextStack,
   mIntoFTypeBuild: (dnode: DastNode) => FunctionTypeBuild
  )
  : ContextOffsetLayout
{
  const mEntries: WritableContextLayoutMap = {};
  const { error, setErrorFn, setErrorMessage } = StandardError.make();

  const parentContextSnapshot = memoize(() => mDeclaredContextStack.contextForHop(1));

  const parentEntryNextIndex = memoize((): number | undefined => {
    const shouldHaveParent = mUsedAncestorCollection.ancestors().length > 0;
    if (!parentContextSnapshot()) {
      if (shouldHaveParent)
        { raise('DAST schema failure'); }
      return 0;
    }

    if (!shouldHaveParent)
      { return 0; }

    const { contextType } = parentContextSnapshot()!;

    const entry = freeze({
      accessIndex: 0,
      type: contextType()
    });
    mEntries[FunctionNamingSchema.kParentName] =
      mEntries[parentContextSnapshot()!.name()] =
      entry;
    return contextType().sizeInBytes();
  });

  const ancestorEntriesNextIndex = memoize((): number | undefined => {
    if (parentEntryNextIndex() === undefined)
      { return undefined; }
    let index = parentEntryNextIndex()!;
    mUsedAncestorCollection.
      ancestors().
      forEach(({ variableName, type }: AncestorInfo) => {
        const entry = freeze({
          accessIndex: index,
          type
        });
        index += type.sizeInBytes();
        return mEntries[variableName] = entry;
      });
    return index;
  });

  const declaredEntries = memoize((): WritableContextLayoutMap | undefined => {
    // everything declared will have to be type discoverable
    if (ancestorEntriesNextIndex() === undefined)
      { return undefined; }

    let index = ancestorEntriesNextIndex()!;
    // chicken and egg problem:
    // for complete type discovery
    // we need DAST nodes mapped to their function types
    // 
    for (const name in mDeclaredNames) {
      const decl = mDeclaredNames[name];
      const varName =
        decl.accessor?.variableName ??
        decl.assignment?.variableName ??
        decl.initialSet?.variableNames;
      if (varName === undefined) {
        raise(`DAST schema failure: declared name "${name}" has no variable names`);
      }
      const build = mIntoFTypeBuild(mDeclaredNames[name].value);
      const ftype = build.functionType();
      if (!ftype)
        { return setErrorFn(build.error); }

      // we gotta handle tuples too :(
      if (Array.isArray(varName)) {
        varName.forEach((v, i) => {
          const entry = freeze({
            accessIndex: index,
            type: ftype.tupleType()!.memberType(i)
          });
          mEntries[v] = entry;
          index += entry.type.sizeInBytes();
        });
      }

    }
    return mEntries;
  });

  const layout = memoize((): ContextLayout | undefined => {

  });

  return freeze({ layout, error });
}

export const ContextLayoutBuild = freeze({ make });