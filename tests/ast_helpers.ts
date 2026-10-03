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

import { AstInitializerExpression, AstNode, AstParameterExpression } from '../src/ast_node';
import { ReseatableAstVisitor } from './ast_visitor_factories';
import { Token } from '../src/token';
import { Helpers } from '../src/helpers';

const { freeze } = Helpers;

const makeVisitor = ReseatableAstVisitor.makeSelfModified;
const makeDefaultVisitor = ReseatableAstVisitor.makeDefaultingToContinue;

const tokenToString = (t: Token) => t.content();

const reduceParams = (acc: string[], params: AstParameterExpression) => {
  acc.push(...params.names.map(tokenToString));
  return acc;
};

function namesFrom
  (nameExpression: AstInitializerExpression | Readonly<AstParameterExpression[]>)
  : Readonly<string[]>
{
  if ('length' in nameExpression) {
    return nameExpression.reduce(reduceParams, [] as string[]);
  }

  return nameExpression.names.map(tokenToString);
}

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
  const recur = (node_: AstNode) => node_.visit(visitor);
  const visitor = makeVisitor({
    ...makeDefaultVisitor(),
    visitInitializer(initializer: AstInitializerExpression) {
      calls.push('let');
      recur(initializer.valueNode);
    },
    visitCall(callName: Token, receiver: AstNode, args: AstNode) {
      calls.push(callName.content());
      recur(receiver);
      recur(args);
    },
    visitFunctionDefinition(
      _0: number,
      parameters: Readonly<AstParameterExpression[]>,
      nodes: Readonly<AstNode[]>)
    {
      parameters.forEach((v: AstParameterExpression) => recur(v.typeNode));
      nodes.forEach(recur);
    },
  });
  expect(node()).toBeDefined();
  node()?.visit(visitor);
  return calls;
}

function parametersFromNode
  (node: () => AstNode | undefined): AstParameterExpression[]
{
  const params: AstParameterExpression[] = [];
  let hitRoot = false;
  const visitor = makeVisitor({
    ...makeDefaultVisitor(),
    visitFunctionDefinition(
      _0: number,
      parameters: Readonly<AstParameterExpression[]>,
      nodes: Readonly<AstNode[]>)
    {
      if (hitRoot) {
        params.push(...parameters);
      } else {
        hitRoot = true;
        nodes.forEach(n => n.visit(visitor));
      }
    }
  });
  expect(node()).toBeDefined();
  node()?.visit(visitor);
  return params;
}

export const AstHelpers = freeze({
  identifiersFromInst: identifiersFromNode,
  callsFromInst: callsFromNode,
  parametersFromInst: parametersFromNode,
  namesFrom
});
