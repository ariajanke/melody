import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { StandardError, StandardErrorFn, StandardErrorMessage } from '../helpers';
import { Helpers } from '../helpers';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstLiteralNode } from './ast_fringe_node';
import { LetVisitor } from './let_declarations_retrieval/let_visitor';
import { LetNameElementSort } from './let_declarations_retrieval/let_name_element_sort';
import { LetNamesCollection } from './let_declarations_retrieval/let_names_collection';

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

function makeVisitorInstance(): AstNodeVisitor<LetNamesCollection> {
  function reduceTuple_(tuple: AstTupleNode) {
    return reduceTuple( tuple.map((node: AstNode) => node.visit(inst)) );
  }
  const inst = freeze({
    visitFunctionCall: (_0: AstFunctionCallNode, _1: AstNode, fArgs: AstTupleNode): LetNamesCollection => {
      return reduceTuple_(fArgs);
    },
    visitLetDeclaration: (declaringNode: AstLetDeclarationNode, node: AstNode) => {
      // I want to associate the names collection...
      // there maybe one node per many names...
      return LetNamesCollection.
        make(node.visit( LetVisitor.make() ).finish(), declaringNode);
    },
    visitIdentifier: (_0: AstIdentifierNode) =>
      LetNamesCollection.makeEmpty(),
    visitTuple: (tuple: AstTupleNode): LetNamesCollection =>
      reduceTuple_(tuple),
    visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
      LetNamesCollection.makeEmpty(),
    visitLiteral: (_0: AstLiteralNode) =>
      LetNamesCollection.makeEmpty()
  });
  return inst;
}

function makeTopVisitor(): AstNodeVisitor<LetNamesCollection> {
  const visitor = visitorInstance();
  const inst = freeze({
    visitFunctionCall: (_0: AstFunctionCallNode, _1: AstNode, fArgs: AstTupleNode): LetNamesCollection => {
      return fArgs.visit(visitor);
    },
    visitLetDeclaration: (letNode: AstLetDeclarationNode, _1: AstNode) => {
      return letNode.visit(visitor);
    },
    visitIdentifier: (_0: AstIdentifierNode) =>
      LetNamesCollection.makeEmpty(),
    visitTuple: (tuple: AstTupleNode): LetNamesCollection =>
      tuple.visit(visitor),
    visitFunctionDefinition: (_0: AstFunctionDefinitionNode, nodes: AstNode[]) =>
      reduceTuple( nodes.map((node: AstNode) => node.visit(visitor)) ),
    visitLiteral: (_0: AstLiteralNode) =>
      LetNamesCollection.makeEmpty()
  });
  return inst;
}

const visitorInstance = memoize(makeVisitorInstance);
const topVisitor = memoize(makeTopVisitor);

function construct(mNode: AstNode) {
  const mVisitor = topVisitor();
  const res = memoize(() => mNode.visit(mVisitor));

  function sortedElements() {
    const elements = res().elements();
    return elements && LetNameElementSort.sortedElementsFor(elements);
  }
  
  return freeze({
    elements: memoize(sortedElements),
    error: () => res().error()
  });
}

export const NameExpressionsRetrieval = freeze({
  asAggregate(elements: NameExpressionElement[]): NameExpressionElement {
    if (elements.length === 0) {
      throw new Error('unhandled');
    }
    let name = '';
    const operator = elements[0].operator;
    const dependeeNames: string[] = [];
    const valueNodes: AstNode[] = [];
    elements.forEach((el: NameExpressionElement) => {
      name = `${name},${name}`;
      dependeeNames.concat(el.dependeeNames);
      valueNodes.push(el.valueNode);

    });
    
    return freeze({
      name, operator, dependeeNames, valueNode: AstTupleNode.make(',', valueNodes),
      tuplePosition: undefined
    });
  },
  make(mNode: AstNode) {
    const mVisitor = LetVisitor.make();
    return mNode.visit(mVisitor).finish();
  }
});
export type NameExpressionsRetrieval = ReturnType<typeof NameExpressionsRetrieval.make>;

export type NameExpressionElement = {
  name: string,
  operator: string,
  dependeeNames: string[],
  valueNode: AstNode
}

export interface LetNameElement extends NameExpressionElement {
  declaringNode: AstLetDeclarationNode,
}

export const LetDeclarationsRetrieval = freeze({ make: construct });
export type  LetDeclarationsRetrieval = ReturnType<typeof construct>;
