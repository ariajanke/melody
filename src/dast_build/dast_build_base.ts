import { DastBuild, DastLetDeclations, MergeableDastBuild } from '../dast_build';
import { Helpers, StandardError, StandardErrorFn } from '../helpers';
import { DastNode } from '../dast_build';
import { DastFunctionDefintion, DastTuple } from './dast_node_specializations';

const { freeze, memoize } = Helpers;

const mergeWithDone = (_0: DastBuild): MergeableDastBuild => {
  throw new Error('Cannot merge after "node" called');
};

function startMultiBuild
  (finishDefinitions?: () => DastLetDeclations): MergeableDastBuild
{
  const { error, setErrorFn } = StandardError.make();
  const mBuilds: DastBuild[] = [];
  let mMergeWith = (build: DastBuild): MergeableDastBuild => {
    mBuilds.push(build);
    return inst;
  };
  const node = memoize((): DastNode | undefined => {
    const nodes: DastNode[] = [];
    for (const build of mBuilds) {
      const res = build.node();
      if (res) {
        nodes.push(res);
      } else {
        setErrorFn(build.error);
        mMergeWith = mergeWithDone;
        return undefined;
      }
    }
    mMergeWith = mergeWithDone;
    // NOTE due to side effects from build nodes
    //      "finishDefinitions" must be ran last!
    if (finishDefinitions) {
      return DastFunctionDefintion.make(finishDefinitions(), nodes);
    } else {
      return DastTuple.make(nodes);
    }
  });

  const inst = freeze({
    node,
    mergeWith: (build: DastBuild): MergeableDastBuild =>
      mMergeWith(build),
    error
  });
  return inst;
}

const defaultImplementations = memoize((): DastBuild => freeze({
  node: () => undefined,
  mergeWith(_0: DastBuild): DastBuild
    { throw new Error('"mergeWith" not supported'); },
  error: StandardError.make().error
}));

export const DastBuildBase = freeze({
  defaultImplementations,
  makeFromNode(node: DastNode): DastBuild {
    return freeze({
      ...defaultImplementations(),
      node: () => node
    });
  },
  makeFailed(errorFn: StandardErrorFn): DastBuild {
    return freeze({
      ...defaultImplementations(),
      error: errorFn
    });
  },
  startTuple: () => startMultiBuild(),
  startDefinition: (fn: () => DastLetDeclations) => startMultiBuild(fn)
});
