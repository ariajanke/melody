import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
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
const kTransformOfAssignment = (contentFn: () => string) =>
  () => `${contentFn()}${OperatorNamingSchema.kAssignment}`;
const kTransformCall = (contentFn: () => string) => contentFn;

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
      content: mTransform(nameTarget()!.content),
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

type StripBuildResult = IastNode | 'not-modified' | undefined;

interface StripBuild {
  node(): StripBuildResult;
  error(): StandardErrorMessage;
};

type StripConstructor =
  (recurseOn: (n: IastNode) => IastNode | undefined, 
   originalCallName: Token,
   receiver: IastNode,
   args: IastNode) => StripBuild;

function makeAssignmentStripping
  (mRecurseOn: (n: IastNode) => IastNode | undefined,
   mOriginalCallName: Token,
   mReceiver: IastNode,
   mArgs: IastNode)
  : StripBuild
{
  const { error, setErrorFn } = StandardError.make();
  const mStripping = makeNameStripping(mOriginalCallName, mReceiver, kTransformOfAssignment);

  const node = memoize(() => {
    // NOTE assignment stripping is mandatory
    if (!mStripping.callName() || !mStripping.receiver()) {
      return setErrorFn(mStripping.error);
    }
    const callName = mStripping.callName()!;
    const receiver = mRecurseOn(mStripping.receiver()!);
    const args = mRecurseOn(mArgs);
    if (receiver === undefined || args === undefined)
      { return undefined; }

    return IastNode.forOperativeStatements.
      makeCall(callName, receiver, args);
  });

  return freeze({
    node, error
  });
}

function makeCallStripping
  (mRecurseOn: (n: IastNode) => IastNode | undefined,
   mOriginalCallName: Token,
   mReceiver: IastNode,
   mArgs: IastNode)
  : StripBuild
{
  const mStripping = makeNameStripping(mOriginalCallName, mReceiver, kTransformCall);
  const node = memoize((): StripBuildResult => {
    // NOTE call stripping is optional
    if (!mStripping.callName() || !mStripping.receiver()) {
      return 'not-modified';
    }

    const callName = mStripping.callName()!;
    const receiver = mRecurseOn(mStripping.receiver()!);
    const args = mRecurseOn(mArgs);
    if (receiver === undefined || args === undefined)
      { return undefined; }

    return IastNode.forOperativeStatements.
      makeCall(callName, receiver, args);
  });

  return freeze({
    node,
    error: () => StandardError.make().error()
  });
}

function makeDotStripping
  (mRecurseOn: (n: IastNode) => IastNode | undefined,
   mOriginalCallName: Token,
   mReceiver: IastNode,
   mArgs: IastNode)
  : StripBuild
{
  const { error, setErrorMessage } = StandardError.make();
  const idName = () =>
    IastNode.forOperativeStatements.tokenize(mArgs) ??
    setErrorMessage(`Token following (${mOriginalCallName.end()}) must be an identifier`);
  const callName = memoize((): Token | undefined => {
    const name = idName();
    if (name === undefined)
      { return undefined; }

    return freeze({
      start: mOriginalCallName.start,
      end  : name.end,
      content: memoize(() =>
        FunctionNamingSchema.mapToFringeAccessor(name.content())),
      type: name.type
    });
  });
  const node = memoize((): StripBuildResult => {
    if (!callName())
      { return undefined; }
    const rec = mRecurseOn(mReceiver);
    if (!rec)
      { return undefined; }

    
    return IastNode.forOperativeStatements.
      makeCall(callName()!, rec, IastNode.emptyTupleInstance());
  });

  return freeze({ node, error });
}

function chooseSpecialization
  (callName: Token, markings: LetMarkings): StripConstructor | undefined

{
  if (callName.content() === OperatorNamingSchema.kAssignment &&
      markings.isOutsideOfLetStatement())
  {
    return makeAssignmentStripping;
  }

  if (callName.content() === OperatorNamingSchema.kDot) {
    return makeDotStripping;
  }

  if (callName.content() === OperatorNamingSchema.kCall)
    { return makeCallStripping; }

  return undefined;
}

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

  const recurseOn = (node: IastNode): IastNode | undefined => {
    mLetsStack.markOutsideLetStatement();
    const gv = node.visit(mVisitor);
    mLetsStack.popMarking();
    if (gv === 'not-modified') {
      return node;
    }
    return gv;
  }

  function visitRegularCall
    (callName: Token, receiver: IastNode, args: IastNode): ResultType
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
    (callName: Token, receiver: IastNode, args: IastNode): ResultType
  {
    const ctor = chooseSpecialization(callName, mLetsStack);
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
