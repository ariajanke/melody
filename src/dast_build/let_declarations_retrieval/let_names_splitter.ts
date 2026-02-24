import { DastNode } from '../../dast_build';
import { StandardError, Helpers } from '../../helpers';
import { DastTuple } from '../dast_node_specializations';

const { freeze, memoize } = Helpers;

const { detuplify } = DastTuple;

export interface NameExpressionBase {
  operator: string;
  value: DastNode;
  dependeeNames: readonly string[];
};

export interface NameExpressionSingle extends NameExpressionBase {
  name: string;
};

export interface NameExpressionSingleToMany extends NameExpressionBase {
  names: readonly string[];
};

export type LetNameElement = NameExpressionSingle | NameExpressionSingleToMany;

export type LetNameGlob = Readonly<{
  names: string[],
  operator: string,
  dependeeNames: readonly string[],
  tupleNode: DastNode
}>

function construct(mGlob: LetNameGlob) {
  const { error, setErrorMessage } = StandardError.make();
  const globCommon = freeze({
    operator: mGlob.operator,
    dependeeNames: mGlob.dependeeNames,
  });
  const mDetupledNodes = detuplify(mGlob.tupleNode);
  const globAsSingle = () => {
    if (!mDetupledNodes) {
      return mGlob.tupleNode;
    }
    return mDetupledNodes[0];
  };
  // let a = 1
  const singleValueMapping = (): NameExpressionSingle => freeze({
    ...globCommon,
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
  const manyToMany = (): NameExpressionSingle[] => (mDetupledNodes?.
    map((node: DastNode, idx: number) => [mGlob.names[idx], node]) as [string, DastNode][]).
    map(([name, node]: [string, DastNode]): NameExpressionSingle => freeze({
      ...globCommon,
      name,
      value: node,
    }));
  function makeElements(): Readonly<LetNameElement[]> | undefined {
    const tupleCount = mDetupledNodes?.length ?? 1;
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
