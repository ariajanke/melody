import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { DeclarationFunctionGroup } from './declaration_function_group';

const { freeze, memoize } = Helpers;

export interface OrderedDeclarationsGroupCollection {
  orderedGroups(): Readonly<DeclarationFunctionGroup[]>;
  cachedBuildFor(dast: DastNode): FunctionTypeBuild | undefined;
};

function make
  (mDeclarationsMap: DastDeclarationMap,
   mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
: OrderedDeclarationsGroupCollection
{
  type FunctionNameSet = { initialSetName?: string; fnames: string[]; };
  type ValueNameMap = { [dastNodeUid: number]: FunctionNameSet | undefined };
  type thing = {
    fbuild: FunctionTypeBuild;
    initialSetName: string;
    fnames: Readonly<string[]>;
    vnames: Readonly<string[]>;
  };

  const valueNameMap = memoize((): ValueNameMap => {
    const valueMap_: ValueNameMap = {};
    for (const name in mDeclarationsMap) {
      const decl = mDeclarationsMap[name];
      const map = valueMap_[decl.value.uid()] ??= { fnames: [] };
      const { fnames } = map;
      if (decl.initialSet) {
        map['initialSetName'] = name;
      }
      fnames.push(name);
    }
    return valueMap_;
  });

  const mOrder: thing[] = [];
  const mDone : { [dastNodeUid: number]: FunctionTypeBuild | undefined } = {};

  function appendInitialSetFrom(name: string) {
    const decl = mDeclarationsMap[name];
    if (!decl)
      { return; }

    const initialSetName = valueNameMap()[decl.value.uid()]?.initialSetName ??
      raise('malformed DAST?');
    appendInitialSet(initialSetName);
  }

  // what if only do initial sets?
  // we can't because dependeeNames might not be initial sets...
  function appendInitialSet(name: string) {
    const decl = mDeclarationsMap[name];
    const { uid } = decl.value;
    if (!decl || mDone[uid()])
      { return; }
    if (!decl.initialSet)
      { raise('called wrong!'); }
    
    const { dependeeNames } = decl.initialSet;
    dependeeNames.forEach(appendInitialSetFrom);
  
    const { fnames, initialSetName } = valueNameMap()[uid()] ?? raise('uh oh');
    const fbuild = mIntoFunctionTypeBuild(decl.value);
    const vnames = decl.initialSet.variableNames;

    if (!initialSetName)
      { raise('uh oh'); }
    
    mDone[uid()] = fbuild;
    mOrder.push({ fnames, initialSetName, fbuild, vnames });
  }

  const orderedGroups = memoize((): Readonly<DeclarationFunctionGroup[]> => {
    for (const name in mDeclarationsMap) {
      appendInitialSetFrom(name);
    }
    return mOrder.map((t: thing) => 
      DeclarationFunctionGroup.make(t.fbuild, t.fnames, t.vnames));
  });

  return freeze({
    orderedGroups,
    cachedBuildFor: (node: DastNode) => mDone[node.uid()]
  });
}

export const OrderedDeclarationsGroupCollection = freeze({ make });
