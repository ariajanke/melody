import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { IastLiteralType, IastNode, IastVisitor } from '../iast_node';
import { Token } from '../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';

export interface IastBuildSingleError {
  node(): IastNode | undefined;
  error(): StandardErrorMessage;
};

const { freeze, memoize } = Helpers;

const nodeCounter = memoize((): IastVisitor<number> => {
  const reduceNodes = (p: number, n: IastNode) => p + n.visit(inst);
  const inst = freeze({
    visitLiteral: (_0: Token, _1: IastLiteralType): number => 1,
    visitFringe: (_0: Token): number => 1,
    visitTuple: (nodes: Readonly<IastNode[]>): number =>
      nodes.reduce(reduceNodes, nodes.length),
    visitLet: (innerNode: IastNode): number =>
      1 + innerNode.visit(inst),
    visitCall: (_1: Token, receiver: IastNode, args: IastNode): number =>
      1 + receiver.visit(inst) + args.visit(inst),
    visitFunctionDefinition: (nodes: Readonly<IastNode[]>): number =>
      1 + nodes.reduce(reduceNodes, nodes.length)
  });
  return inst;
});

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
    // if (node_.visit(nodeCounter()) !== collection().count()) {
    //   return setErrorMessage(`could not create single expression from ...`);
    // }
    return node_;
  });

  return freeze({ node, error });
}

export const IastOperationBuild = freeze({ make });
