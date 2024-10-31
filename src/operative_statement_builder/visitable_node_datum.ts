import { Helpers } from '../helpers';
import { type Token } from '../token';
import { type OperativeStatementVisitor } from '../operative_statement_builder';
import { type AstNode } from '../ast_node';

const { freeze, memoize } = Helpers;

export interface VisitableNodeDatum {
  asString        : () => string,
  uniqueIdentifier: () => symbol,
  visit           : (visitor: OperativeStatementVisitor) => void
};

export const VisitableNodeDatum = freeze({
  makeForToken: (token: Token): VisitableNodeDatum => freeze({
    asString        : token.content,
    uniqueIdentifier: memoize(Symbol),
    visit           : (visitor: OperativeStatementVisitor) =>
      visitor.visitToken(token)
  }),
  makeForNode: (node: AstNode): VisitableNodeDatum => freeze({
    asString        : node.asString,
    uniqueIdentifier: memoize(Symbol),
    visit           : (visitor: OperativeStatementVisitor) =>
      visitor.visitNode(node)
  })
});
