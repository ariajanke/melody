import { DastAttributeDeclaration, DastDeclarationMap, DastLetDeclaration, DastNode } from '../../dast_build';
import { Helpers, raise } from '../../helpers';

const { freeze, memoize } = Helpers;

export interface InitialSetVariables {
  name: string;
  variableNames: Readonly<string[]>;
  valueNode: DastNode;
};

interface WritableVariableNameFunctions {
  accessorName?: string;
  modifierName?: string;
  tupleRank?: number;
};

export type VariableNameFunctions =
  Readonly<WritableVariableNameFunctions>;

export interface OrderedInitialSetsCollection {
  orderedInitialSets(): Readonly<Readonly<InitialSetVariables>[]>;
  variableNameMap(): Readonly<{ [vname: string]: VariableNameFunctions | undefined }>;
};

function makeVariableNameMap(mDeclarationsMap: DastDeclarationMap) {
  const rv: { [vname: string]: WritableVariableNameFunctions | undefined } = {};
  function forAttribute
    (name: string, attr: DastAttributeDeclaration, kind: 'accessorName' | 'modifierName')
  {
    const { tupleRank } = attr;
    const entry = rv[attr.variableName] ??= { tupleRank };
    if (entry.tupleRank !== tupleRank) {
      raise('uh oh, mismatching tuple rank!');
    }
    entry[kind] = name;
  }

  for (const name in mDeclarationsMap) {
    const decl = mDeclarationsMap[name];
    if (decl.initialSet)
      { continue; }

    if (decl.accessor) {
      forAttribute(name, decl.accessor, 'accessorName');
    } else if (decl.assignment) {
      forAttribute(name, decl.assignment, 'modifierName');
    }
  }
  return rv;
}

function make
  (mDeclarationsMap: DastDeclarationMap,
   mHasDependeeDefined: (name: string) => boolean
  )
{
  type DastInitialSet = DastLetDeclaration['initialSet'];

  const mOrder: InitialSetVariables[] = [];
  const mDone: { [name: string] : 'done' | undefined } = {};

  const mapVariableToInitialSet =
    memoize((): Readonly<{ [varName: string]: InitialSetVariables | undefined }> =>
  {
    const rv: { [varName: string]: InitialSetVariables | undefined } = {};
    for (const name in mDeclarationsMap) {
      const decl = mDeclarationsMap[name];
      if (!decl.initialSet)
        { continue; }

      const { variableNames } = decl.initialSet;
      variableNames.forEach((vname: string) => {
        rv[vname] = freeze({ name, variableNames, valueNode: decl.value });
      });
    }
    return freeze(rv);
  });

  function forEntryByVariableName(vname: string) {
    const initialSetName = (mapVariableToInitialSet()[vname] ??
      raise(`Could not find initial set for variable '${vname}'`)).name;
    forEntry(initialSetName, 'enforceInitialSet');
  }

  function recurOnDependee(ftypeName: string) {
    const decl = mDeclarationsMap[ftypeName];
    if (!decl && !mHasDependeeDefined(ftypeName)) {
      raise(`No such fname found for '${ftypeName}'`);
    }
    if (!decl)
      { return; }
    
    const name = decl.accessor?.variableName ?? decl.assignment?.variableName;
    if (name) {
      forEntryByVariableName(name);
    }
    decl.initialSet?.variableNames?.forEach(forEntryByVariableName);
  }

  function appendOnceToOrder
    (initialSetName: string, set: DastInitialSet)
  {
    if (mDone[initialSetName])
      { return; }

    (set ?? raise('must be defined')).
      dependeeNames.forEach(recurOnDependee);

    mOrder.push({
      name: initialSetName,
      variableNames: set!.variableNames,
      valueNode: mDeclarationsMap[initialSetName]!.value
    });
    mDone[initialSetName] = 'done';
  }

  function forEntry(fname: string, enforceIsInitialSet?: 'enforceInitialSet') {
    const decl = mDeclarationsMap[fname];
    if (!decl.initialSet) {
      if (enforceIsInitialSet === 'enforceInitialSet') {
        raise(`'${fname}' is not an initial set??`);
      }
      return;
    }

    appendOnceToOrder(fname, decl.initialSet);
  }

  const orderedInitialSets = memoize((): Readonly<Readonly<InitialSetVariables>[]> => {
    Object.keys(mDeclarationsMap).forEach((fname: string) => forEntry(fname));
    return mOrder;
  });

  const variableNameMap =
    memoize((): Readonly<{ [vname: string]: VariableNameFunctions | undefined }> =>
      makeVariableNameMap(mDeclarationsMap));

  return freeze({ orderedInitialSets, variableNameMap });
}

export const OrderedInitialSetsCollection = freeze({ make });
