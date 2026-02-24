import type { DastBuild, DastLetDeclation, DastNode } from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { DastInitialSet } from './dast_node_specializations';

const { freeze, memoize } = Helpers;

interface DastInitialSetElementBase {
  operator: string;
  dependeeNames: readonly string[];
}

interface DastInitialSetElementSingle extends DastInitialSetElementBase {
  name: string;
};

interface DastInitialSetElementMany extends DastInitialSetElementBase {
  names: readonly string[];
};

type DastInitialSetElement =
  DastInitialSetElementSingle | DastInitialSetElementMany;

function mergeWith(_0: DastBuild): DastBuild {
  throw new Error('Cannot merge with an initial set build');
}

function initialSetFrom(element: DastInitialSetElement, value: DastNode): DastNode {
  const namegroup: string | readonly string[] =
    (element as DastInitialSetElementSingle).name ??
    (element as DastInitialSetElementMany).names;
  return DastInitialSet.make(namegroup, value);
}

function make(mDestinationDefinitions: DastLetDeclation[],
              mInteriorBuild: DastBuild,
              mElement: DastInitialSetElement): DastBuild
{
  const { error, setErrorFn } = StandardError.make();
  const node = memoize(() => {
    const value = mInteriorBuild.node();
    if (!value) {
      return setErrorFn(mInteriorBuild.error);
    }


    mDestinationDefinitions.push({ ...mElement, value });
    const namegroup: string | readonly string[] =
      (mElement as DastInitialSetElementSingle).name ??
      (mElement as DastInitialSetElementMany).names;

    return DastInitialSet.make(namegroup, value);
  });
  return freeze({ error, mergeWith, node });
}

export const DastInitialSetBuild = freeze({ make, initialSetFrom });
