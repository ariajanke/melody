import { CallBackObjectHold } from './call_back_object_hold';
import { DastBuild, DastNode, WritableDastDeclarationMap } from '../dast_build';
import { GenericSet, StandardError, raise } from '../helpers';
import { IastNode } from '../iast_node';
import { Helpers } from '../helpers';
import { DastFunctionDefintion } from './dast_node_specializations';
import { DastNamesCollector } from './dast_names_collector';
import { FunctionNamingSchema } from '../function_naming_schema';
import { CarriedNamesRegistry } from './carried_names_registry';

const { freeze, memoize } = Helpers;

const makeUniqueName = (() => {
  let count = 0;
  return (): string =>
    FunctionNamingSchema.uniqueFrameNameFor(count++);
})();

function make
  (mNodes: Readonly<IastNode[]>,
   mIntoDastBuild: (node: IastNode) => DastBuild,
   mObjectHolder: CallBackObjectHold<WritableDastDeclarationMap>,
   mCarriedNamesRegistry: CarriedNamesRegistry
  ): DastBuild
{
  // there are addition to pending and declared names "carried names"
  // these are names which necessitate a "<parent>" pending name, but do not
  // need to be defined for the current context 
  const { error, setErrorFn } = StandardError.make();
  const { withHeldObject, currentObject } = mObjectHolder;
  const mDeclarations: WritableDastDeclarationMap = {};  
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

  const namesCollector = memoize(() => {
    const collector = DastNamesCollector.
      make('forFunctionDefinition', mCarriedNamesRegistry);
    finishedNodes()?.forEach(collector.collectFromNode);
    return collector;
  });
  
  const carriedNames = memoize(() => {
    const descNames = namesCollector().descendentCarriedNames();
    const carriedNames = GenericSet.make<string>();
    descNames.forEach((name: string) => {
      if (finishedDeclarations()?.[name]) {
        return;
      }
      carriedNames.add(name);
    });
    return carriedNames;
  });

  const pendingNames_ = memoize(() => {
    const pendingNames: { [name: string]: true } = {};
    const decl = finishedDeclarations();
    if (!decl)
      { raise('attempted to get pending names out of order'); }
    namesCollector().names().forEach(name => {
      if (decl[name])
        { return; }

      pendingNames[name] = true;
    });
    if (carriedNames().size > 0 ||
        Object.keys(pendingNames).length > 0)
    { pendingNames[kParentName] = true; }
    return pendingNames;
  });

  const node = memoize(() => {
    // NOTE order of operations is important here
    const declaredNames = finishedDeclarations();
    const nodes = finishedNodes();
    if (!nodes || !declaredNames)
      { return undefined; }

    const pendingNames = pendingNames_();
    const node = DastFunctionDefintion.
      make({ name: makeUniqueName(), declaredNames, pendingNames }, [...nodes]);
    mCarriedNamesRegistry.register(node, carriedNames());
    return node;
  });

  return freeze({ error, node });
}

export const DastFunctionDefintionBuild = freeze({ make });
