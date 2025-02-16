import { StandardError, Helpers } from '../../helpers';
import { AstNode } from '../ast_node';
import { AstTupleNode } from '../ast_tuple_node';
import { NameExpressionElement } from '../let_declarations_retrieval';

const { freeze, memoize } = Helpers;

export type LetNameGlob = Readonly<{
  names: string[],
  operator: string,
  dependeeNames: string[],
  tupleNode: AstTupleNode
}>

function construct(mGlob: LetNameGlob) {
  const { error, setErrorMessage } = StandardError.make();
  const globCommon = freeze({
    operator: mGlob.operator,
    dependeeNames: mGlob.dependeeNames,
  });
  const globAsSingle = () => {
    if (mGlob.tupleNode.count() !== 1) {
      // throw new Error('uh oh');
      return mGlob.tupleNode;
    }
    return mGlob.tupleNode.map((node: AstNode) => node)[0];
  };
  // let a = 1
  const singleValueMapping = () => freeze({
    ...globCommon,
    name: mGlob.names[0],
    valueNode: globAsSingle(),
  });
  // let (a, b, ...) = t
  const singleToMany = () => freeze({
    ...globCommon,
    name: mGlob.names.join(','),
    valueNode: mGlob.tupleNode
  });
  // let (a, b, ...) = (1, 2, ...)
  const manyToMany = () => (mGlob.
    tupleNode.
    map((node: AstNode) => node).
    map((node: AstNode, idx: number) => [mGlob.names[idx], node]) as [string, AstNode][]).
    map(([name, node]: [string, AstNode]): NameExpressionElement => freeze({
      ...globCommon,
      name,
      valueNode: node,
    }));
  function makeElements(): Readonly<NameExpressionElement[]> | undefined {
    const tupleCount = mGlob.tupleNode.count();
    const nameCount = mGlob.names.length;
    if (nameCount === 1) {
      return [singleValueMapping()];
    } else if (nameCount > 1 && tupleCount === 1) {
      return [singleToMany()];
    } else if (nameCount > 1 && tupleCount === nameCount) {
      return manyToMany();
    }
    return setErrorMessage(`Cannot map ${nameCount} names to ${tupleCount} values.`);
  }
  return freeze({
    elements: memoize(makeElements),
    error
  });
}

function makeEmpty() {
  return freeze({
    elements: (): Readonly<NameExpressionElement[]> | undefined => [],
    error: () => StandardError.make().error(),
  });
} 

export const LetNamesSplitter = freeze({
  make: construct,
  makeEmpty: memoize(makeEmpty)
});
export type  LetNamesSplitter = ReturnType<typeof construct>;
