/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

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
