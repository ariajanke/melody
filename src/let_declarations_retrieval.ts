import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { StandardError, StandardErrorFn } from './helpers';
import { LetNamesCollection } from './let_names_collection';
import { LetNameElement } from './let_names_collection';
import { Helpers } from './helpers';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstLiteralNode } from './ast_fringe_node';
import { LetVisitor2 } from './let_visitor';

const { freeze, memoize } = Helpers;

type LetCollectionVisitor = AstNodeVisitor<LetNamesCollection>;

type Reducable = [Readonly<LetNameElement[]> | undefined, StandardErrorFn];
function reduceTuple(collections: LetNamesCollection[]) {
  if (collections.length === 0) {
    return freeze({
      elements: (): Readonly<LetNameElement[]> => [],
      error: () => StandardError.make().error()
    });
  }
  const [elements, error] = collections.
    map((collection: LetNamesCollection): Reducable =>
      [collection.elements(), collection.error]).
    reduce((prev: Reducable, cur: Reducable): Reducable => {
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

function makeVisitorInstance(): LetCollectionVisitor {
  function reduceTuple_(tuple: AstTupleNode) {
    return reduceTuple( tuple.map((node: AstNode) => node.visit(inst)) );
  }
  const inst = freeze({
    visitFunctionCall: (_0: AstFunctionCallNode, _1: AstNode, fArgs: AstTupleNode): LetNamesCollection => {
      return reduceTuple_(fArgs);
    },
    visitLetDeclaration: (_0: AstLetDeclarationNode, node: AstNode) => {
      return node.visit( LetVisitor2.make() ).finish();
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

function construct(mNode: AstNode): LetNamesCollection {
  const mVisitor = topVisitor();
  const res = memoize(() => mNode.visit(mVisitor));
  
  return freeze({
    elements: () => res().elements(),
    error: () => res().error()
  });
}

export const LetDeclarationsRetrieval = freeze({ make: construct });
export type  LetDeclarationsRetrieval = ReturnType<typeof construct>;
