import { FunctionNamingSchema } from '../../function_naming_schema';
import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { ContextFrameSnapshot, ContextFrameStack } from '../context_frame_stack';
import { TupleObjectFactory } from '../tuple_type';

const { freeze, memoize } = Helpers;

export interface AncestorInfo {
  type: ObjectType;
  variableName: string;
};

export interface ExtendedAncestorInfo extends AncestorInfo {
  use: 'used' | 'unused';
};

export interface UsedAncestorCollection {
  allAncestors(): Readonly<ExtendedAncestorInfo[]>;
  ancestors(): Readonly<AncestorInfo[]>;
  ancestorNames(): Readonly<string[]>;
  ancestorTupleType(): ObjectType;
  hasParentGetter(): boolean;
};

function make
  (mStackThing: ContextFrameStack,
   mPendingNames: Readonly<{ [name: string]: true }>)
  : UsedAncestorCollection
{
  const parentContextSnapshot = ((): ContextFrameSnapshot | undefined =>
    mStackThing.contextForHop(1));

  const ancestors = memoize((): Readonly<AncestorInfo[]> => 
    allAncestors().filter(({ use }) => use === 'used'));

  const hasParentGetter = memoize(() => {
    if (!parentContextSnapshot()) {
      if (Object.keys(mPendingNames).length > 0)
        { raise('DAST schema failure'); }
      return false;
    }
    return Object.keys(mPendingNames).length > 0;
  });

  const allAncestors = memoize((): Readonly<ExtendedAncestorInfo[]> => {
    const found: { [hops: number]: ObjectType | undefined } = {};
    const parentUid = parentContextSnapshot()?.referenceType().uid();
    mapNamesToParents().forEach(([name, parent]: [string, ObjectType]) => {
      if (parent.uid() === parentUid)
        { return; }
      found[mStackThing.hopCountFor(name)] = parent;
    });

    const result: ExtendedAncestorInfo[] = [];
    // NOTE skip the current context, and immediate parent
    const kSkipCurrentAndParent = 2;
    for (let i = kSkipCurrentAndParent; ; ++i) {
      const snapshot = mStackThing.contextForHop(i);
      if (!snapshot)
        { break; }
      const { referenceType, uniqueName } = snapshot;
      const use = found[i] ? 'used' : 'unused';
      result.push({ use, type: referenceType(), variableName: uniqueName() });
    }
    return result;
  });

  const mapNamesToParents = memoize((): [string, ObjectType][] => {
    if (Object.keys(mPendingNames).length === 0)
      { return []; }

    const found: [string, ObjectType][] = [];
    for (const name in mPendingNames) {
      if (name === FunctionNamingSchema.kParentName)
        { continue; }
      const foundIn: ObjectType = mStackThing.findWhereDeclared(name);
      found.push([name, foundIn]);
    }
    return found;
  });

  const ancestorNames = memoize(() =>
    ancestors().map(({ variableName }) => variableName));

  const ancestorTupleType = memoize(() =>
    TupleObjectFactory.make(ancestors().map(({ type }) => type)));

  return freeze({
    allAncestors,
    ancestors,
    ancestorNames,
    ancestorTupleType,
    hasParentGetter
  });
}

export const UsedAncestorCollection = freeze({ make });
