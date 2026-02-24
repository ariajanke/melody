import { DastBuild, DastNode } from '../../dast_build';
import { DastInitialSet, DastTuple } from '../dast_node_specializations';
import { LetNamesCollector } from './let_names_collector';
import { NamingExpressionVisitor } from './naming_expression_visitor';
import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { IastNode } from '../../iast_node';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { DastNamesCollector } from '../dast_names_collector';
import { LetNameElement } from './let_names_splitter';

const { freeze, memoize } = Helpers;

export interface DastLetDeclarationBuild {
  dastNode(): DastNode | undefined;
  elements(): Readonly<LetNameElement[]> | undefined;
  error(): StandardErrorMessage;
}

function make
  (mCallName: IastNode,
   mReceiver: IastNode,
   mArgs: IastNode,
   mIntoDastBuild: (node: IastNode) => DastBuild)
  : DastLetDeclarationBuild
{
  const { error, setErrorFn, setErrorMessage } = StandardError.make();

  const callNameStr = memoize(() => {
    const callNameStr = mCallName.asString();
    if (callNameStr !== '=' && // TODO use FunctionNamingSchema
        callNameStr !== FunctionNamingSchema.kAssignmentOperator)
    {
      return setErrorMessage(`unexpected operator "${callNameStr}" in let declaration`);
    }
    return callNameStr;
  });

  const declaredNames = memoize(() => {
    const visitor = NamingExpressionVisitor.make();
    const res = mReceiver.visit(visitor);
    return res.names() ?? setErrorFn(res.error);
  });

  const dastArgNode = memoize(() => {
    const argsBuild = mIntoDastBuild(mArgs);
    return argsBuild.node() ?? setErrorFn(argsBuild.error);
  });

  const dependeeNames = memoize(() => {
    const argNode = dastArgNode();
    if (!argNode)
      { return undefined; }
    // NOTE the *same* logic we use to net up call/fringe names everwhere else!
    return DastNamesCollector.make().collectFromNode(argNode).names();
  });

  const elementsCollector = memoize(() => {
    if (!( declaredNames() && callNameStr() && dependeeNames() && dastArgNode() ))
      { return undefined; }

    return LetNamesCollector.
      make([...declaredNames()!], callNameStr()!, dependeeNames()!, 
            dastArgNode()!).
      finish();
  });

  const elements = memoize(() => elementsCollector()?.elements());

  const elementDastNodes = memoize(() =>
    elements()?.map((element: LetNameElement) => {
      const namegroup = 'name' in element ? element.name : element.names;
      return DastInitialSet.make(namegroup, element.value);
    }));

  const dastNode = memoize(() => {
    if (!elementDastNodes())
      { return undefined; }

    return DastTuple.make(elementDastNodes()!);
  });

  return freeze({
    dastNode,
    elements,
    error
  });
}

function makeError(message: string): DastLetDeclarationBuild {
  const { error, setErrorMessage } = StandardError.make();
  setErrorMessage(message);
  return freeze({
    dastNode: () => undefined,
    elements: () => undefined,
    error
  });
}

export const DastLetDeclarationBuild = freeze({ make, makeError });
