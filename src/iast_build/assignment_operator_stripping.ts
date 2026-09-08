import { Helpers, raise } from '../helpers';
import { IastLiteralType, IastNode } from '../iast_node';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import { IastBuild_ } from './iast_build_constructor_retrieval';
import { ReceiverNameStripping } from './receiver_name_stripping';

const { freeze, memoize } = Helpers;

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
    if (callName.content() === OperatorNamingSchema.kAssignment &&
        mLetsStack.isOutsideOfLetStatement()
    ) {
      const { nameTarget, strippedTree, error } =
        ReceiverNameStripping.make(receiver);
      if (!nameTarget()) {
        mErrorCollection.pushError(error());
        return undefined;
      }

      const callNameToken: Token = freeze({
        content: () => `${nameTarget()!.content()}${OperatorNamingSchema.kAssignment}`,
        type   : nameTarget()!.type,
        start  : nameTarget()!.start,
        end    : callName.end
      });
      mLetsStack.popMarking();
      return IastNode.forOperativeStatements.
        makeCall(callNameToken, strippedTree()!, args);
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
