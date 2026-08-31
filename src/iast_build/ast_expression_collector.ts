import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { IastNode } from '../iast_node';
import { Token } from '../token';
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

export const AstExpressionCollector = freeze({
  make(): AstExpressionCollector
{
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

      const opsAtPrec = mOperators.
        sort((a: OperatorConstructor, b: OperatorConstructor) => a.compare(b));
      return freeze({
        node: memoize(() => {
          for (let i = 0; i < opsAtPrec.length - 1; ++i) {
            opsAtPrec[i].makeNode(mConstructors);
          }
          return opsAtPrec[opsAtPrec.length - 1].makeNode(mConstructors);
        }),
        error
      });
    })
  });
  }
});
