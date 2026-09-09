import { Helpers, raise, StandardError } from '../helpers';
import { IastNode } from '../iast_node';
import { Token } from '../token';
import { IastBuildSingleError, IastOperationBuild } from './iast_operation_build';
import { type NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';
import { OperatorConstructorBuild } from './operator_constructor_build';

const { freeze, memoize } = Helpers;

export interface AstExpressionCollector {
  pushNode(node: IastNode): void;
  pushOperator(op: Token): void;
  finish(): IastBuildSingleError;
};

// everything needs to be replaced, except in two cases: 1 and 0 nodes

// TODO validate (produce an error) if tokens do not hook up right...

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

      const len = mConstructors.length;
      const position = () => len;

      mConstructors.push(freeze({
        isOperator: () => false,
        asToken: () => undefined,
        makeNode(_0: NodeConstructorCollection): IastNode
          { return node; },
        lowPosition: position,
        highPosition: position
      }));
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
    finish: memoize((): IastBuildSingleError => {
      mFinished = true;
      if (hasErrorSet()) {
        return freeze({
          node: () => undefined,
          error
        });
      }

      return IastOperationBuild.make(mConstructors, mOperators);
    })
  });
}

export const AstExpressionCollector = freeze({ make });
