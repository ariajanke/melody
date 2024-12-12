import { AstNode } from './ast_node';
import { AstNodeVisitor } from './ast_node_visitor';
import { AstTupleNode } from './ast_tuple_node';
import { StandardErrorFn } from './helpers';
import { LetNamesCollectionNew } from './let_names_collection_new';
import { LetNameElement } from '../src/let_names_collection_new';
import { Helpers } from './helpers';
import { AstFunctionCallNode } from './ast_function_call_node';
import { AstLetDeclarationNode } from './ast_let_declaration_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstLiteralNode } from './ast_fringe_node';
import { LetVisitor2 } from './let_visitor';

const { freeze, memoize } = Helpers;

function makeVisitorInstance(): AstNodeVisitor<LetNamesCollectionNew> {
  type Reducable = [Readonly<LetNameElement[]> | undefined, StandardErrorFn];
  function reduceTuple(tuple: AstTupleNode) {
    const collections = tuple.map((node: AstNode) => node.visit(inst));
      const [elements, error] = collections.
        map((collection: LetNamesCollectionNew): Reducable =>
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
  const inst = freeze({
    visitFunctionCall: (callNode: AstFunctionCallNode, receiver: AstNode, fArgs: AstTupleNode): LetNamesCollectionNew => {
      return reduceTuple(fArgs);
    },
    visitLetDeclaration: (letNode: AstLetDeclarationNode, node: AstNode) => {
      return node.visit( LetVisitor2.make() ).finish();
    },
    visitIdentifier: (_0: AstIdentifierNode) =>
      LetNamesCollectionNew.makeEmpty(),
    visitTuple: (tuple: AstTupleNode): LetNamesCollectionNew =>
      reduceTuple( tuple),
    visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
      LetNamesCollectionNew.makeEmpty(),
    visitLiteral: (_0: AstLiteralNode) =>
      LetNamesCollectionNew.makeEmpty()
  });
  return inst;
}

const visitorInstance = memoize(makeVisitorInstance);

function construct(mNode: AstNode): LetNamesCollectionNew {
  const mVisitor = visitorInstance();
  const res = memoize(() => mNode.visit(mVisitor));
  
  return freeze({
    elements: () => res().elements(),
    error: () => res().error()
  });
}

export const LetDeclarationsRetrieval = freeze({ make: construct });
export type  LetDeclarationsRetrieval = ReturnType<typeof construct>;
