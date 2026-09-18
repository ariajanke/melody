import { Helpers } from '../helpers';
import { AstInitializerType, AstLiteralType, AstNode } from '../ast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import { AstBuild_ } from './ast_build_constructor_retrieval';
import { LetMarkingStack } from './operator_stripping/let_markings_stack';
import {
  StripBuild,
  StripBuildResult
} from './operator_stripping/strip_build';

const { freeze, memoize } = Helpers;

function visitLiteral(_0: Token, _1: AstLiteralType): StripBuildResult
  { return 'not-modified'; }

function visitFringe(_0: Token): StripBuildResult
  { return 'not-modified'; }

const {
  makeFunctionDefinition,
  makeTuple,
  makeInitializer,
  makeCall,
} = AstNode.forOperatorStripping;

function make(mRawTreeRoot: AstNode): AstBuild_ {
  const mLetsStack = LetMarkingStack.make();
  const mErrorCollection = ErrorsCollector.make();

  function makeNodesVisitFunction(intoNode: (n: AstNode[]) => AstNode) {
    return (nodes: Readonly<AstNode[]>): StripBuildResult => {
      mLetsStack.markOutsideLetStatement();
      const gvs = nodes.map(n => n.visit(mVisitor));
      mLetsStack.popMarking();

      if (gvs.every(n => n === 'not-modified'))
        { return 'not-modified'; }

      if (gvs.some(n => n === undefined))
        { return undefined; }

      type Narrowed = AstNode | 'not-modified';

      const gvsAsNodes = (gvs as Narrowed[]).map((v: Narrowed, idx: number) =>
        v === 'not-modified' ? nodes[idx] : v);

      return intoNode(gvsAsNodes);
    };
  }

  const visitFunctionDefinition_ =
    makeNodesVisitFunction(makeFunctionDefinition);

  const visitFunctionDefinition = (_0: number, nodes: Readonly<AstNode[]>) =>
    visitFunctionDefinition_(nodes);

  const visitTuple = makeNodesVisitFunction(makeTuple);

  function visitInitializer
    (names: Readonly<Token[]>,
     initType: AstInitializerType,
     innerNode: AstNode): StripBuildResult
  {
    mLetsStack.markInsideLetStatement();
    const gv = innerNode.visit(mVisitor);
    mLetsStack.popMarking();

    if (gv === 'not-modified' || gv === undefined)
      { return gv; }

    return makeInitializer(names, initType, gv);
  }

  const recurseOn = (node: AstNode): AstNode | undefined => {
    mLetsStack.markOutsideLetStatement();
    const gv = node.visit(mVisitor);
    mLetsStack.popMarking();
    if (gv === 'not-modified')
      { return node; }

    return gv;
  };

  function visitRegularCall
    (callName: Token, receiver: AstNode, args: AstNode): StripBuildResult
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
    return makeCall(callName, receiver, args);
  }

  function visitCall
    (callName: Token, receiver: AstNode, args: AstNode): StripBuildResult
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
    visitInitializer,
    visitCall
  });

  const node = memoize((): AstNode | undefined => {
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

export const OperatorStripping = freeze({ make });
