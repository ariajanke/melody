import {
  StandardError,
  StandardErrorFn,
  StandardErrorMessage
} from '../helpers';
import { Helpers } from '../helpers';
import {
  RetrievingLetVisitor
} from './let_declarations_retrieval/retrieving_let_visitor';
import {
  LetNameElementSort
} from './let_declarations_retrieval/let_name_element_sort';
import {
  LetNamesCollection
} from './let_declarations_retrieval/let_names_collection';
import { IastNode, IastVisitor } from '../iast_node';

const { freeze, memoize } = Helpers;

type Reducable<Type> = [Readonly<Type[]> | undefined, StandardErrorFn];
type ElementsCollection<Type> = {
  elements(): Readonly<Type[]> | undefined,
  error(): StandardErrorMessage
}
function reduceTuple<Type>(collections: Readonly<ElementsCollection<Type>[]>): ElementsCollection<Type> {
  if (collections.length === 0) {
    return freeze({
      elements: (): Readonly<Type[]> => [],
      error: () => StandardError.make().error()
    });
  }
  const [elements, error] = collections.
    map((collection: ElementsCollection<Type>): Reducable<Type> =>
      [collection.elements(), collection.error]).
    reduce((prev: Reducable<Type>, cur: Reducable<Type>): Reducable<Type> => {
      if (prev[0]) {
        const [elements, errorFn] = cur;
        if (elements) {
          return [prev[0].concat(elements), errorFn];
        }
        return cur;
      }
      return prev;
    });
  return freeze({ elements: () => elements, error });
}

function makeVisitorInstance(): IastVisitor<LetNamesCollection> {
  const visitFringe = (_0: string) =>
    LetNamesCollection.makeEmpty();
  const inst = freeze({
    visitCall: (_0: IastNode, _1: IastNode, fArgs: IastNode): LetNamesCollection => {
      return fArgs.visit(inst);
    },
    visitLet(innerNode: IastNode) {
      // I want to associate the names collection...
      // there maybe one node per many names...
      return LetNamesCollection.
        make(innerNode.visit( RetrievingLetVisitor.make() ).finish());
    },
    visitFringe,
    visitString: visitFringe,
    visitInteger: visitFringe,
    visitTuple(nodes: Readonly<IastNode[]>) {
      const reses = nodes.map(v => v.visit<LetNamesCollection>(inst));
      return reduceTuple(reses);
    },
    visitFunctionDefinition(_0: Readonly<IastNode[]>) {
      throw new Error('not sure what this means');
    },
  });
  return inst;
}

function onFirstVisitLet(innerNode: IastNode): LetNamesCollection {
  return LetNamesCollection.
    make(innerNode.visit( RetrievingLetVisitor.make() ).finish());
}

function makeTopVisitor(): IastVisitor<LetNamesCollection> {
  const visitor = visitorInstance();
  const visitFringe = (_0: string) => 
    LetNamesCollection.makeEmpty();
  const inst = freeze({
    visitCall: (_0: IastNode, _1: IastNode, fArgs: IastNode): LetNamesCollection =>
      fArgs.visit(visitor),
    visitLet: onFirstVisitLet,
    visitFringe,
    visitString: visitFringe,
    visitInteger: visitFringe,
    visitTuple: (nodes: Readonly<IastNode[]>): LetNamesCollection =>
      reduceTuple( nodes.map((node: IastNode) => node.visit(visitor)) ),
    visitFunctionDefinition: (nodes: Readonly<IastNode[]>) =>
      reduceTuple( nodes.map((node: IastNode) => node.visit(visitor)) )
  });
  return inst;
}

const visitorInstance = memoize(makeVisitorInstance);
const topVisitor = memoize(makeTopVisitor);

function construct(mNode: IastNode, mSkipTop: boolean = false) {
  const mVisitor = topVisitor();
  const res = memoize((): LetNamesCollection => {
    if (mSkipTop) {
      return onFirstVisitLet(mNode);
    }
    return mNode.visit(mVisitor);
  });

  function sortedElements() {
    const elements = res().elements();
    return elements && LetNameElementSort.sortedElementsFor(elements);
  }
  
  return freeze({
    elements: memoize(sortedElements),
    error: () => res().error()
  });
}

export interface NameExpressionBase {
  operator: string;
  value: IastNode;
  dependeeNames: readonly string[];
};
export type NameExpressionValueMap = Readonly<{
  [name: string]: IastNode;
}>;
export interface NameExpressionSingle extends NameExpressionBase {
  name: string;
};
export interface NameExpressionSingleToMany extends NameExpressionBase {
  names: readonly string[];
};

export type LetNameElement = NameExpressionSingle | NameExpressionSingleToMany;  //interface LetNameElement extends NameExpressionElement {}

export const LetDeclarationsRetrieval = freeze({
  make: construct,
  skipTop: true
});
export type  LetDeclarationsRetrieval = ReturnType<typeof construct>;
