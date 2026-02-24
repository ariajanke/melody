import { FunctionNamingSchema } from '../../function_naming_schema';
import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { ContextFrameStack } from '../context_frame_stack';

const { freeze, memoize } = Helpers;

export interface AncestorInfo {
  type: ObjectType;
  variableName: string;
};

export interface AncestorCollection {
  /// order as follows: from least to most deep
  allAncestorsOrdered(): Readonly<AncestorInfo[]>;
  parentReference(): ObjectType | undefined;
  parentUniqueName(): string | undefined;
  searchForOriginalByName(fName: string): ObjectType | undefined;
};

const kDepthToParent = 0;

function make(mStackThing: ContextFrameStack): AncestorCollection {
  const { atDepth } = mStackThing;

  function searchName_(name: string, idx: number): ObjectType | undefined {
    if (name === FunctionNamingSchema.kParentName)
      { raise('should not call with parent'); }

    const ancestor = atDepth(idx)?.referenceType();
    if (!ancestor)
      { return undefined; }

    const fLookUp = ancestor.lookUp(name);
    if (!fLookUp)
      { return searchName_(name, idx + 1); }

    const ftype = fLookUp.uniqueFunctionType();
    if (!ftype)
      { return undefined; }

    if (ftype.receiver().uid() !== ancestor.uid())
      { return searchName_(name, idx + 1); }

    return ancestor;
  }

  const allAncestorsOrdered = memoize((): Readonly<AncestorInfo[]> => {
    const rv: AncestorInfo[] = [];
    const kSkipParent = 1;
    for (let i = kSkipParent; ; ++i) {
      if (!atDepth(i))
        { break; }

      const { referenceType, uniqueName } = atDepth(i)!;
      rv.push({ type: referenceType(), variableName: uniqueName() });
    }
    return rv;
  });

  const parentReference = memoize(() => atDepth(kDepthToParent)?.referenceType());

  const parentUniqueName = memoize(() => atDepth(kDepthToParent)?.uniqueName());

  const searchForOriginalByName = (name: string): ObjectType | undefined =>
    searchName_(name, kDepthToParent);

  return freeze({
    allAncestorsOrdered,
    parentReference,
    parentUniqueName,
    searchForOriginalByName,
  });
}

export const AncestorCollection = freeze({ make });
