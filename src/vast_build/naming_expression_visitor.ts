import { Helpers, StandardError } from '../helpers';
import { type AstNodeVisitor } from './ast_node_visitor';
import { type AstFunctionCallNode } from './ast_function_call_node';
import { type AstNode } from './ast_node';
import { type AstTupleNode } from './ast_tuple_node';
import { type AstLetDeclarationNode } from './ast_let_declaration_node';
import { type AstFunctionDefinitionNode } from './ast_function_definition_node';
import { AstIdentifierNode } from './ast_identifier_node';
import { AstLiteralNode } from './ast_fringe_node';

const { freeze, memoize } = Helpers;

export const NamingExpressionResult = freeze({
  makeErroneousWithMessage(message: string) {
    return freeze({
      names: () => undefined,
      error: memoize(() => freeze({ message }))
    }) satisfies NamingExpressionResult;
  },
  make(collection: string[]) {
    const { error } = StandardError.make();
    return freeze({
      names: (): Readonly<string[]> | undefined => collection,
      error
    });
  }
});
export type NamingExpressionResult = ReturnType<typeof NamingExpressionResult.make>;

export const NamingExpressionVisitor = freeze({
  make(): AstNodeVisitor<NamingExpressionResult> {
    const inst = freeze({
      visitFunctionCall: (_0: AstFunctionCallNode, _1: AstNode, _2: AstTupleNode) =>
        NamingExpressionResult.
          makeErroneousWithMessage(`function call not allowed`),
      visitTuple(node: AstTupleNode) {
        const names = node.
          map((node: AstNode) => node.visit<NamingExpressionResult>(inst));
        const res = names.
          reduce((prev: NamingExpressionResult, cur: NamingExpressionResult) => {
            if (prev.names()) {
              return cur;
            } else {
              return prev;
            }
          });
        if (!res.names()) {
          return res;
        }
        const mapped = names.map((res: NamingExpressionResult) =>
          res.names() as Readonly<string[]>);
        const names_ = mapped.reduce((prev: Readonly<string[]>, cur: Readonly<string[]>) =>
          [...prev, ...cur]);
        return NamingExpressionResult.make([...names_]);
      },
      visitIdentifier(node: AstIdentifierNode) {
        return NamingExpressionResult.make([node.asString()]);
      },
      visitLetDeclaration: (_0: AstLetDeclarationNode, _1: AstNode) =>
        NamingExpressionResult.
          makeErroneousWithMessage('nested lets not allowed'),
      visitFunctionDefinition: (_0: AstFunctionDefinitionNode, _1: AstNode[]) =>
        NamingExpressionResult.
          makeErroneousWithMessage('function defs not allowed'),
      visitLiteral: (node: AstLiteralNode) =>
        NamingExpressionResult.
          makeErroneousWithMessage(`Fringe (literal) "${node.asString()} not allowed`)
    });
    return inst;
  }
});
