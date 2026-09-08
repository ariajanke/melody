import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { IastNode } from '../iast_node';
import { Token } from '../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';
import { OperatorConstructorBuild } from './operator_constructor_build';

const { freeze, memoize } = Helpers;

export interface IastBuildSingleError {
  node(): IastNode | undefined;
  error(): StandardErrorMessage;
};

export interface AstExpressionCollector {
  pushNode(node: IastNode): void;
  pushOperator(op: Token): void;
  finish(): IastBuildSingleError;
};

// everything needs to be replaced, except in two cases: 1 and 0 nodes

// TODO validate (produce an error) if tokens do not hook up right...

function makeSomething
  (mConstructors: NodeConstructor[], mOperators: OperatorConstructor[])
  : IastBuildSingleError
{
  const { error, setErrorMessage } = StandardError.make();

  const sortedOperators = memoize(() => 
    mOperators.sort((a: OperatorConstructor, b: OperatorConstructor) => -a.compare(b)));

  const collection = memoize(() =>
    NodeConstructorCollection.make(mConstructors));

  const node = memoize(() => {
    if (mConstructors.length === 0)
      { return IastNode.makeEmptyTuple(); }

    const sortedLen = sortedOperators().length;
    if (sortedLen === 0)
      { return mConstructors[0].makeNode(collection()); }

    for (let i = 0; i < sortedLen; ++i) {
      sortedOperators()[i].makeNode(collection());
    }

    const ctor = sortedOperators()[sortedLen - 1];
    const node_ = ctor.makeNode(collection());
    const missedCtor = collection().firstUnreplaced();
    if (missedCtor !== undefined) {
      const token = missedCtor.asToken();
      return setErrorMessage(`stray "${token?.content() ?? '<UNKNOWN>'}" not absorbed into tree`);
    }
    return node_;
  });

  return freeze({ node, error });
}

function make(): AstExpressionCollector {
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mConstructors: NodeConstructor[] = [];
  const mOperators: OperatorConstructor[] = [];
  let mFinished = false;

  function verifyUnfinished() {
    if (!mFinished)
      { return; }

    raise('cannot add to collector after it is finished');
  }
  
  function isInUnaryContext() {
    return mConstructors.length === 0 ||
           mConstructors[mConstructors.length - 1].isOperator();
  }

  return freeze({
    pushNode(node: IastNode): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      mConstructors.push(OperatorConstructor.fromNode(node));
    },
    pushOperator(op: Token): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      const { operatorConstructor, error } = OperatorConstructorBuild.
        make(op, isInUnaryContext(), mConstructors.length);

      if (!operatorConstructor()) {
        return setErrorFn(error); // <- set error
      }
      const opCtor = operatorConstructor()!
      mConstructors.push(opCtor);
      mOperators.push(opCtor);
    },
    finish: memoize(() => {
      mFinished = true;
      if (hasErrorSet()) {
        return freeze({
          node: () => undefined,
          error
        });
      }

      return makeSomething(mConstructors, mOperators);
    })
  });
}

export const AstExpressionCollector = freeze({ make });
