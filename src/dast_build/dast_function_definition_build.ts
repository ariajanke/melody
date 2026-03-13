import { CallBackObjectHold } from '../call_back_object_hold';
import { DastBuild, DastNode, WritableDastDeclarationMap } from '../dast_build';
import { StandardError, raise } from '../helpers';
import { IastNode } from '../iast_node';
import { Helpers } from '../helpers';
import { DastFunctionDefintion } from './dast_node_specializations';
import { DastNamesCollector } from './dast_names_collector';
import { FunctionNamingSchema } from '../function_naming_schema';

const { freeze, memoize } = Helpers;

const makeUniqueName = (() => {
  let count = 0;
  return () =>
    FunctionNamingSchema.uniqueFrameNameFor(count++);
})();

function make
  (mNodes: Readonly<IastNode[]>,
   mIntoDastBuild: (node: IastNode) => DastBuild,
   mObjectHolder: CallBackObjectHold<WritableDastDeclarationMap>
  ): DastBuild
{
  const mDeclarations: WritableDastDeclarationMap = {};

  const { error, setErrorFn } = StandardError.make();
  const { withHeldObject, currentObject } = mObjectHolder;
  const { kParentName } = FunctionNamingSchema;

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
    const collector = DastNamesCollector.make('forFunctionDefinition');
    finishedNodes()?.forEach(collector.collectFromNode);
    return collector.names();
  });

  const pendingNames_ = memoize(() => {
    const pendingNames: { [name: string]: true } = {};
    const decl = finishedDeclarations();
    if (!decl)
      { raise('attempted to get pending names out of order'); }
    usedNames().forEach(name => {
      if (decl[name])
        { return; }

      pendingNames[name] = true;
    });
    if (Object.keys(pendingNames).length > 0) {
      pendingNames[kParentName] = true;
    }
    return pendingNames;
  });

  const node = memoize(() => {
    // NOTE order of operations is important here
    const declaredNames = finishedDeclarations();
    const nodes = finishedNodes();
    if (!nodes || !declaredNames)
      { return undefined; }

    const pendingNames = pendingNames_();
    return DastFunctionDefintion.
      make({ name: makeUniqueName(), declaredNames, pendingNames }, [...nodes]);
  });

  return freeze({ error, node });
}

export const DastFunctionDefintionBuild = freeze({ make });
