import { Helpers } from '../helpers';
import { IastLiteralType, IastNode } from '../iast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import { IastBuild_ } from './iast_build_constructor_retrieval';
import { LetMarkingStack } from './iast_operator_stripping/let_markings_stack';
import {
  StripBuild,
  StripBuildResult
} from './iast_operator_stripping/strip_build';

const { freeze, memoize } = Helpers;

function visitLiteral(_0: Token, _1: IastLiteralType): StripBuildResult
  { return 'not-modified'; }

function visitFringe(_0: Token): StripBuildResult
  { return 'not-modified'; }

function make(mRawTreeRoot: IastNode): IastBuild_ {
  const mLetsStack = LetMarkingStack.make();
  const mErrorCollection = ErrorsCollector.make();

  function makeNodesVisitFunction(intoNode: (n: IastNode[]) => IastNode) {
    return (nodes: Readonly<IastNode[]>): StripBuildResult => {
      mLetsStack.markOutsideLetStatement();
      const gvs = nodes.map(n => n.visit(mVisitor));
      mLetsStack.popMarking();

      if (gvs.every(n => n === 'not-modified'))
        { return 'not-modified'; }

      if (gvs.some(n => n === undefined))
        { return undefined; }

      type Narrowed = IastNode | 'not-modified';

      const gvsAsNodes = (gvs as Narrowed[]).map((v: Narrowed, idx: number) =>
        v === 'not-modified' ? nodes[idx] : v);

      return intoNode(gvsAsNodes);
    };
  }

  const visitFunctionDefinition =
    makeNodesVisitFunction(IastNode.makeFunctionDefinition);
  const visitTuple =
    makeNodesVisitFunction(IastNode.forLetDeclarationRetrievals.makeTuple);

  function visitLet(innerNode: IastNode): StripBuildResult {
    mLetsStack.markInsideLetStatement();
    const gv = innerNode.visit(mVisitor);
    mLetsStack.popMarking();

    if (gv === 'not-modified' || gv === undefined)
      { return gv; }

    return IastNode.forOperativeStatements.makeLetDeclation(gv);
  }

  const recurseOn = (node: IastNode): IastNode | undefined => {
    mLetsStack.markOutsideLetStatement();
    const gv = node.visit(mVisitor);
    mLetsStack.popMarking();
    if (gv === 'not-modified') {
      return node;
    }
    return gv;
  };

  function visitRegularCall
    (callName: Token, receiver: IastNode, args: IastNode): StripBuildResult
  {
    mLetsStack.markOutsideLetStatement();
    const recGv = receiver.visit(mVisitor);
    const argGv = args.visit(mVisitor);
    mLetsStack.popMarking();

    if (recGv === argGv && recGv === 'not-modified')
      { return 'not-modified'; }

    if (recGv === undefined || argGv === undefined)
      { return undefined; }

    if (recGv !== 'not-modified')
      { receiver = recGv; }
    if (argGv !== 'not-modified')
      { args = argGv; }
    return IastNode.forOperativeStatements.
      makeCall(callName, receiver, args);
  }

  function visitCall
    (callName: Token, receiver: IastNode, args: IastNode): StripBuildResult
  {
    const ctor = StripBuild.chooseSpecialization(callName, mLetsStack);
    if (!ctor)
      { return visitRegularCall(callName, receiver, args); }

    const { node, error } = ctor(recurseOn, callName, receiver, args);
    if (node() === undefined) {
      mErrorCollection.pushError(error());
      return undefined;
    }
    
    if (node() === 'not-modified') {
      return visitRegularCall(callName, receiver, args);
    }

    return node();
  }

  const mVisitor = freeze({
    visitLiteral,
    visitFringe,
    visitFunctionDefinition,
    visitTuple,
    visitLet,
    visitCall
  });

  const node = memoize((): IastNode | undefined => {
    const res = mRawTreeRoot.visit(mVisitor);
    if (res === 'not-modified')
      { return mRawTreeRoot; }

    return res;
  });

  return freeze({
    node,
    errors: mErrorCollection.errors
  });
}

export const IastOperatorStripping = freeze({ make });
