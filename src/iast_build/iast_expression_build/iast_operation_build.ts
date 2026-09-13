import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { IastNode } from '../../iast_node';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';

export interface IastBuildSingleError {
  node(): IastNode | undefined;
  error(): StandardErrorMessage;
};

const { freeze, memoize } = Helpers;

function make
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
      { return IastNode.emptyTupleInstance(); }

    const sortedLen = sortedOperators().length;
    if (sortedLen === 0) {
      if (mConstructors.length === 1)
        { return mConstructors[0].makeNode(collection()); }

      return setErrorMessage(`expression ends too soon around ""`);
    }

    for (let i = 0; i < sortedLen - 1; ++i) {
      sortedOperators()[i].makeNode(collection());
    }

    const weakestBindingOperator = sortedOperators()[sortedLen - 1];
    const node_ = weakestBindingOperator.makeNode(collection());
    const missedCtor = collection().firstUnreplaced();
    if (missedCtor !== undefined) {
      const token = missedCtor.asToken();
      return setErrorMessage(`expression ends too soon around "${token?.content() ?? '<UNKNOWN>'}"`);
    }

    return node_;
  });

  return freeze({ node, error });
}

export const IastOperationBuild = freeze({ make });
