import { AstNode, AstInitializerType } from '../src/ast_node';
import { ReseatableAstVisitor } from './ast_visitor_factories';
import { Token } from '../src/token';
import { Helpers } from '../src/helpers';

const { freeze } = Helpers;

const makeVisitor = ReseatableAstVisitor.makeSelfModified;
const makeDefaultVisitor = ReseatableAstVisitor.makeDefaultingToContinue;

function identifiersFromNode(node: () => AstNode | undefined): string[] {
  const strings: string[] = [];
  const visitor = makeVisitor({
    ...makeDefaultVisitor(),
    visitFringe(t: Token) {
      strings.push(t.content());
    }
  });
  expect(node()).toBeDefined();
  node()?.visit(visitor);
  return strings;
}

function callsFromNode(node: () => AstNode | undefined): string[] {
  const calls: string[] = [];
  const visitor = makeVisitor({
    ...makeDefaultVisitor(),
    visitInitializer(
      _0: Readonly<Token[]>,
      _1: AstInitializerType,
      innerNode: AstNode)
    {
      calls.push('let');
      innerNode.visit(visitor);
    },
    visitCall(callName: Token, receiver: AstNode, args: AstNode) {
      calls.push(callName.content());
      receiver.visit(visitor);
      args.visit(visitor);
    }
  });
  expect(node()).toBeDefined();
  node()?.visit(visitor);
  return calls;
}

export const AstHelpers = freeze({
  identifiersFromInst: identifiersFromNode,
  callsFromInst: callsFromNode
});
