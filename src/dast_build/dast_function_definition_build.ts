import { CallBackObjectHold } from '../call_back_object_hold';
import { DastBuild, DastNode, WritableDastDeclarationMap } from '../dast_build';
import { StandardError } from '../helpers';
import { IastNode } from '../iast_node';
import { Helpers } from '../helpers';
import { DastFunctionDefintion } from './dast_node_specializations';
import { DastNamesCollector } from './dast_names_collector';

const { freeze, memoize } = Helpers;

function make
  (mNodes: Readonly<IastNode[]>,
   mIntoDastBuild: (node: IastNode) => DastBuild,
   mObjectHolder: CallBackObjectHold<WritableDastDeclarationMap>
  ): DastBuild
{
  const mDeclarations: WritableDastDeclarationMap = {};

  const { error, setErrorFn } = StandardError.make();
  const { withHeldObject, currentObject } = mObjectHolder;

  const nodeBuilds = memoize(() => mNodes.map(mIntoDastBuild));

  const finishedNodes = memoize((): Readonly<DastNode[]> | undefined => {
    // NOTE force a raise if this is called before "finishedDeclarations"
    currentObject();

    const nodes = nodeBuilds()?.
      map(build => build.node() ?? setErrorFn(build.error));
    if (!nodes || nodes.some((n: DastNode | undefined) => !n))
      { return undefined; }
    return nodes as DastNode[];
  });

  const finishedDeclarations = memoize(() =>
    withHeldObject(() => mDeclarations, () => 
      finishedNodes() ? mDeclarations : undefined));

  const usedNames = memoize(() => {
    const collector = DastNamesCollector.make('excludeInitialSet');
    finishedNodes()?.forEach(collector.collectFromNode);
    return collector.names();
  });

  const pendingNames_ = memoize(() => {
    const pendingNames: { [name: string]: true } = {};
    usedNames().forEach(name => {
      // screens out names that are already declared
      if (!currentObject()[name]) {
        pendingNames[name] = true;
      }
    });
    return pendingNames;
  });

  const node = memoize(() => {
    // NOTE order of operations is important here
    const declaredNames = finishedDeclarations();
    const nodes = finishedNodes();
    const pendingNames = pendingNames_();
    if (!nodes || !declaredNames)
      { return undefined; }
    return DastFunctionDefintion.
      make({ declaredNames, pendingNames }, [...nodes]);
  });

  return freeze({ error, node });
}

export const DastFunctionDefintionBuild = freeze({ make });
