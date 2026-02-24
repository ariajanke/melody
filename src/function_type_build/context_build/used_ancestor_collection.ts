import { FunctionNamingSchema } from '../../function_naming_schema';
import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { AncestorCollection, AncestorInfo } from './ancestor_collection';

const { freeze, memoize } = Helpers;

export interface ExtendedAncestorInfo extends AncestorInfo {
  use: 'used' | 'unused';
};

export interface UsedAncestorCollection {
  allAncestorsOrdered(): Readonly<ExtendedAncestorInfo[]>;
  ancestors(): Readonly<AncestorInfo[]>;

  // NOTE absence is not evidence of an error
  parent(): AncestorInfo | undefined;

  mapNameToAncestor(name: string): ObjectType | undefined;
};

type NameToDepthAndAncestor = { [name: string]: ObjectType | undefined };
type ObjectUidToItself = { [uid: symbol]: ObjectType | undefined };

function make
  (mAncestorCollection: AncestorCollection,
   mPendingNames: Readonly<{ [name: string]: true }>)
  : UsedAncestorCollection
{
  const {
    searchForOriginalByName,
    parentReference,
    parentUniqueName,
  } = mAncestorCollection;

  const allAncestorsOrdered = memoize((): Readonly<ExtendedAncestorInfo[]> =>
    // NOTE assert that all pending names, regardless whether ancestors is
    //      empty or not
    framesUsed() &&
    mAncestorCollection.
    allAncestorsOrdered().
    map((info: AncestorInfo): ExtendedAncestorInfo =>
      freeze({
        ...info,
        use: isUsed(info.type) ? 'used' : 'unused'
      })));

  const parent = memoize((): AncestorInfo | undefined => {
    if (!parentReference()) {
      if (Object.keys(mPendingNames).length > 0)
        { raise('DAST schema failure'); }
      return undefined;
    }

    if (parentUniqueName() === undefined)
      { raise('poor behavior'); }

    return freeze({
      type: parentReference()!,
      variableName: parentUniqueName()!
    });
  });

  const namesToParentsMap = memoize((): Readonly<NameToDepthAndAncestor> => {
    const map: NameToDepthAndAncestor = {};
    for (const name in mPendingNames) {
      if (name === FunctionNamingSchema.kParentName)
        { continue; }

      map[name] = searchForOriginalByName(name) ??
                  raise(`name '${name}' not defined anywhere in the stack`);
    }
    return map;
  });
  
  const framesUsed = memoize((): ObjectUidToItself => {
    const found: { [uid: symbol]: ObjectType | undefined } = {};
    const parentUid = parentReference()?.uid();
    if (!parentUid)
      { return found; }

    for (const name in namesToParentsMap()) {
      const parent = namesToParentsMap()[name] ?? raise('cannot relocate name?');
      if (parent.uid() === parentUid)
        { continue; }

      found[parent.uid()] = parent;
    }
    return found;
  });

  function isUsed(stackFrame: ObjectType): boolean {
    if (!parentReference())
      { return false; }

    return framesUsed()[stackFrame.uid()] !== undefined;
  }

  function mapNameToAncestor(name: string): ObjectType | undefined {
    return namesToParentsMap()[name] ?? searchForOriginalByName(name);
  }

  const ancestors = memoize((): Readonly<AncestorInfo[]> =>
    allAncestorsOrdered().filter(({ use }) => use === 'used'));

  const inst = freeze({
    mapNameToAncestor,
    allAncestorsOrdered,
    ancestors,
    parent
  });
  return inst;
}

export const UsedAncestorCollection = freeze({ make });
