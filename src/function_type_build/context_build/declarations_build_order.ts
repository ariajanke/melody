import { DastDeclarationMap, DastNode } from '../../dast_build';
import { FunctionTypeBuild } from '../../function_type_build';
import { Helpers } from '../../helpers';

const { freeze, memoize } = Helpers;

export interface DeclarationsBuildOrder {
  buildsInOrder(): Readonly<FunctionTypeBuild[]>;
  mapDastToBuild(node: DastNode): FunctionTypeBuild | undefined;
};

export const DeclarationsBuildOrder = freeze({
  make(
    mDeclarationsMap: DastDeclarationMap,
    mIntoFunctionTypeBuild: (node: DastNode) => FunctionTypeBuild)
  : DeclarationsBuildOrder
  {
    const mDastSet: { [dastUid: number]: FunctionTypeBuild } = {};
    const mFtypeBuildOrder: FunctionTypeBuild[] = [];

    function addFtypeBuildOnceFor(node: DastNode) {
      const build = mIntoFunctionTypeBuild(node);
      if (mDastSet[node.uid()])
        { return; }
      mDastSet[node.uid()] = build;
      mFtypeBuildOrder.push(build);
    }

    const varNameToDependees = memoize(() => {
      const varNameToDependees_: { [name: string]: { dependeeNames: Readonly<string[]>; value: DastNode; } } = {};
      for (const name in mDeclarationsMap) {
        const decl = mDeclarationsMap[name];
        if (decl.initialSet === undefined)
          { continue; }
        const { variableNames, dependeeNames } = decl.initialSet;
        variableNames.forEach((name: string) => {
          varNameToDependees_[name] = { dependeeNames, value: decl.value };
        }); 
      }
      return varNameToDependees_;
    });

    function doName(name: string): void {
      const { dependeeNames, value } = varNameToDependees()[name];
      dependeeNames.forEach(doName);
      addFtypeBuildOnceFor(value);
    }

    function iterateVarNames() {
      for (const name in varNameToDependees()) {
        doName(name);
      }
    }

    const inst = freeze({
      buildsInOrder: memoize((): Readonly<FunctionTypeBuild[]> => {
        iterateVarNames();
        return mFtypeBuildOrder;
      }),
      mapDastToBuild(node: DastNode): FunctionTypeBuild | undefined {
        inst.buildsInOrder();
        return mDastSet[node.uid()];
      }
    });
    return inst;
  }
});
