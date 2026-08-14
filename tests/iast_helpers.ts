import { IastNode } from '../src/iast_node';
import { ReseatableIastVisitor } from './iast_visitor_factories';
import { Token } from '../src/token';
import { Helpers } from '../src/helpers';

const { freeze } = Helpers;

const makeVisitor = ReseatableIastVisitor.makeSelfModified;
const makeDefaultVisitor = ReseatableIastVisitor.makeDefaultingToContinue;

function identifiersFromNode(node: () => IastNode | undefined): string[] {
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

function callsFromNode(node: () => IastNode | undefined): string[] {
  const calls: string[] = [];
  const visitor = makeVisitor({
    ...makeDefaultVisitor(),
    visitLet(innerNode: IastNode) {
      calls.push('let');
      innerNode.visit(visitor);
    },
    visitCall(callName: Token, receiver: IastNode, args: IastNode) {
      calls.push(callName.content());
      receiver.visit(visitor);
      args.visit(visitor);
    }
  });
  expect(node()).toBeDefined();
  node()?.visit(visitor);
  return calls;
}

export const IastHelpers = freeze({
  identifiersFromInst: identifiersFromNode,
  callsFromInst: callsFromNode
});
