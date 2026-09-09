import { Helpers, raise, StandardError } from '../helpers';
import { IastLiteralType, IastNode } from '../iast_node';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import { IastBuild_ } from './iast_build_constructor_retrieval';
import { ReceiverNameStripping } from './receiver_name_stripping';

const { freeze, memoize } = Helpers;

interface LetMarkings {
  isOutsideOfLetStatement(): boolean;
};

const LetMarkingStack = freeze({
  make() {
    const mInsideLet: (boolean | undefined)[] = [];

    return freeze({
      markInsideLetStatement(): void {
        mInsideLet.push(true);
      },
      markOutsideLetStatement(): void {
        mInsideLet.push(false);
      },
      popMarking<T = undefined>(with_?: T): T | undefined {
        mInsideLet.pop();
        return with_;
      },
      isOutsideOfLetStatement(): boolean
        { return mInsideLet[mInsideLet.length - 1] !== true; },
      assertEmpty(why: string): void {
        if (mInsideLet.length === 0)
          { return; }

        raise(why);
      }
    });
  }
});

type CallNameTransform = (fn: () => string) => (() => string);
function transformCallNameFunctionOf
  (callName: Token, letStack: LetMarkings):
  CallNameTransform | undefined
{
  if (callName.content() === OperatorNamingSchema.kAssignment &&
      letStack.isOutsideOfLetStatement())
  {
    return (contentFn: () => string) =>
      () => `${contentFn()}${OperatorNamingSchema.kAssignment}`;
  }

  if (callName.content() === OperatorNamingSchema.kCall)
    { return (contentFn: () => string) => contentFn; }

  return undefined;
}

function makeNameStripping
  (mCallName: Token, mReceiver: IastNode, mTransform: CallNameTransform)
{
  const { setErrorFn, error } = StandardError.make();
  
  const mStripping = ReceiverNameStripping.make(mReceiver);
  
  const callName = memoize((): Token | undefined => {
    const { nameTarget, error } = mStripping;

    if (!nameTarget())
      { return setErrorFn(error); }

    return freeze({
      content: nameTarget()!.content,
      type   : nameTarget()!.type,
      start  : nameTarget()!.start,
      end    : mCallName.end
    });
  });
  
  const receiver = memoize((): IastNode | undefined => {    
    const { strippedTree, error } = mStripping;

    return setErrorFn(error) ?? strippedTree();
  });

  return freeze({
    callName,
    receiver,
    error
  });
}

// strip *all* ":=", except right inside a let
// strip *all* calls, for stripable names
function make(mRawTreeRoot: IastNode): IastBuild_ {
  type ResultType = IastNode | 'not-modified' | undefined;

  const mLetsStack = LetMarkingStack.make();
  const mErrorCollection = ErrorsCollector.make();

  function visitLiteral(_0: Token, _1: IastLiteralType): ResultType
    { return 'not-modified'; }

  function visitFringe(_0: Token): ResultType
    { return 'not-modified'; }

  function makeNodesVisitFunction(intoNode: (n: IastNode[]) => IastNode) {
    return (nodes: Readonly<IastNode[]>): ResultType => {
      mLetsStack.markOutsideLetStatement();
      const gvs = nodes.map(n => n.visit(mVisitor));
      if (gvs.every(n => n === 'not-modified'))
        { return mLetsStack.popMarking('not-modified'); }

      if (gvs.some(n => n === undefined))
        { return mLetsStack.popMarking(undefined); }

      type Narrowed = IastNode | 'not-modified';

      const gvsAsNodes = (gvs as Narrowed[]).map((v: Narrowed, idx: number) =>
        v === 'not-modified' ? nodes[idx] : v);

      mLetsStack.popMarking();
      return intoNode(gvsAsNodes);
    };
  }

  const visitFunctionDefinition =
    makeNodesVisitFunction(IastNode.makeFunctionDefinition);
  const visitTuple =
    makeNodesVisitFunction(IastNode.forLetDeclarationRetrievals.makeTuple);

  function visitLet(innerNode: IastNode): ResultType {
    mLetsStack.markInsideLetStatement();
    const gv = innerNode.visit(mVisitor);
    mLetsStack.popMarking();

    if (gv === 'not-modified' || gv === undefined)
      { return gv; }

    return IastNode.forOperativeStatements.makeLetDeclation(gv);
  }

  function visitCall
    (callName: Token, receiver: IastNode, args: IastNode): ResultType
  {
    const callNameTransform = transformCallNameFunctionOf(callName, mLetsStack);
    if (callNameTransform !== undefined) {
      const stripping = makeNameStripping(callName, receiver, callNameTransform);
      if (!stripping.callName() || !stripping.receiver()){
        mErrorCollection.pushError(stripping.error());
        return undefined;
      }

      callName = stripping.callName()!;
      receiver = stripping.receiver()!;
    }
    mLetsStack.markOutsideLetStatement();
    const recGv = receiver.visit(mVisitor);
    const argGv = args.visit(mVisitor);
    mLetsStack.popMarking();
    if (recGv === argGv && recGv === 'not-modified')
      { return mLetsStack.popMarking('not-modified'); }

    if (recGv === undefined || argGv === undefined)
      { return mLetsStack.popMarking(undefined); }

    if (recGv !== 'not-modified')
      { receiver = recGv; }
    if (argGv !== 'not-modified')
      { args = argGv; }
    return IastNode.forOperativeStatements.
      makeCall(callName, receiver, args);
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

export const AssignemntOperatorStripping = freeze({ make });
