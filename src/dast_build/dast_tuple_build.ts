import { DastBuild, DastNode } from '../dast_build';
import { IastNode } from '../iast_node';
import { Helpers, StandardError } from '../helpers';
import { DastTuple } from './dast_node_specializations';

const { freeze, memoize } = Helpers;

function make
  (mNodes: Readonly<IastNode[]>,
   mIntoDastBuild: (node: IastNode) => DastBuild): DastBuild
{
  const { error, setErrorFn } = StandardError.make();

  const nodeBuilds = memoize(() => mNodes.map(mIntoDastBuild));

  const finishedNodes = memoize((): Readonly<DastNode[]> | undefined => {
    const nodes = nodeBuilds()?.
      map(build => build.node() ?? setErrorFn(build.error));
    if (!nodes || nodes.some((n: DastNode | undefined) => !n))
      { return undefined; }
    
    return nodes as DastNode[];
  });

  const node = memoize(() => {
    if (!finishedNodes())
      { return undefined; }
    return DastTuple.make([...finishedNodes()!]);
  });

  return freeze({
    error,
    node
  });
}

export const DastTupleBuild = freeze({ make });
