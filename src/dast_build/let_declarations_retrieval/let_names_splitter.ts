import { StandardError, Helpers } from '../../helpers';
import { IastNode } from '../../iast_node';
import {
  LetNameElement,
  NameExpressionSingle,
  NameExpressionSingleToMany
} from '../let_declarations_retrieval';

const { freeze, memoize } = Helpers;

const { detuplify } = IastNode.forLetDeclarationRetrievals;

export type LetNameGlob = Readonly<{
  names: string[],
  operator: string,
  dependeeNames: readonly string[],
  tupleNode: IastNode
}>

function construct(mGlob: LetNameGlob) {
  const { error, setErrorMessage } = StandardError.make();
  const globCommon = freeze({
    operator: mGlob.operator,
    dependeeNames: mGlob.dependeeNames,
  });
  const mDetupledNodes = detuplify(mGlob.tupleNode);
  const globAsSingle = () => {
    if (mDetupledNodes.length !== 1) {
      return mGlob.tupleNode;
    }
    return mDetupledNodes[0];
  };
  // let a = 1
  const singleValueMapping = (): NameExpressionSingle => freeze({
    ...globCommon,
    // namesDefined: mGlob.names,
    name: mGlob.names[0],
    value: globAsSingle(),
  });

  // let (a, b, ...) = t
  const singleToMany = (): NameExpressionSingleToMany => freeze({
    ...globCommon,
    names: mGlob.names,
    value: mGlob.tupleNode
  });
  // let (a, b, ...) = (1, 2, ...)
  const manyToMany = (): NameExpressionSingle[] => (mDetupledNodes.
    map((node: IastNode, idx: number) => [mGlob.names[idx], node]) as [string, IastNode][]).
    map(([name, node]: [string, IastNode]): NameExpressionSingle => freeze({
      ...globCommon,
      name,
      value: node,
    }));
  function makeElements(): Readonly<LetNameElement[]> | undefined {
    const tupleCount = mDetupledNodes.length;
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
    elements: (): Readonly<LetNameElement[]> | undefined => [],
    error: () => StandardError.make().error(),
  });
} 

export const LetNamesSplitter = freeze({
  make: construct,
  makeEmpty: memoize(makeEmpty)
});
export type  LetNamesSplitter = ReturnType<typeof construct>;
