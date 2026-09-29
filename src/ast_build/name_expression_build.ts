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

import {
  AstInitializerType,
  AstLiteralType,
  AstNameExpression,
  AstNode,
  AstVisitor
} from '../ast_node';
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';

const { freeze, memoize } = Helpers;

const visitToUndefined = memoize((): AstVisitor<undefined> => freeze({
  visitLiteral: (_0: Token, _1: AstLiteralType): undefined =>
    undefined,
  visitFringe: (_0: Token): undefined => undefined,
  visitTuple: (_0: Readonly<AstNode[]>): undefined => undefined,
  visitInitializer:
    (_0: AstNameExpression,
     _1: AstInitializerType,
     _2: AstNode): undefined =>
    undefined,
  visitCall: (_0: Token, _1: AstNode, _2: AstNode): undefined =>
    undefined,
  visitFunctionDefinition: (_0: number, _1: Readonly<AstNameExpression[]>,_2: Readonly<AstNode[]>): undefined =>
    undefined
}));

const recurseForTuple = (node: AstNode): Token | undefined =>
  node.visit(nextLevel());

const tokenIsAbsent = (value: Token | undefined) =>
  value === undefined;

const topLevelForTokens = memoize((): AstVisitor<Readonly<Token[]> | undefined> => freeze({
  ...visitToUndefined(),
  visitFringe: (token: Token): Readonly<Token[]> | undefined =>
    [token],
  visitTuple(nodes: Readonly<AstNode[]>): Readonly<Token[]> | undefined {
    const gv = nodes.map(recurseForTuple);
    if (gv.some(tokenIsAbsent))
      { return undefined; }

    return gv as Readonly<Token[]>;
  },
}));

const nextLevel = memoize((): AstVisitor<Token | undefined> => freeze({
  ...visitToUndefined(),
  visitFringe: (token: Token): Token | undefined => token
}));

export interface NameExpressionBuild {
  nameExpression(): AstNameExpression | undefined;
  error(): StandardErrorMessage;
};

function visitFringe(token: Token): AstNameExpression {
  return freeze({
    names: [token],
    type: AstNode.forOperatorStripping.emptyTupleInstance()
  });
}

function visitTuple(nodes: Readonly<AstNode[]>): AstNameExpression | undefined {
  const tokens = topLevelForTokens().visitTuple(nodes)
  if (tokens === undefined)
    { return tokens; }

  return freeze({
    names: tokens,
    type: AstNode.forOperatorStripping.emptyTupleInstance()
  });
}

function make(mNode: AstNode): NameExpressionBuild {
  const { error, setErrorMessage } = StandardError.make();

  function withCall(callName: Token, receiver: AstNode, args: AstNode): AstNameExpression | undefined {
    if (callName.content() !== OperatorNamingSchema.kIs) {
      return setErrorMessage('name expression may only contain a singly "is" operator');
    }

    const names = receiver.visit(topLevelForTokens());
    if (!names)
      { return setErrorMessage('invalid name set'); }

    return freeze({
      names,
      type: args
    });
  }

  const visitor = ((): AstVisitor<AstNameExpression | undefined> => freeze({
    ...visitToUndefined(),
    visitFringe,
    visitTuple,
    visitCall: withCall
  }));

  const nameExpression = memoize((): AstNameExpression | undefined =>
    mNode.visit(visitor()) ?? setErrorMessage(`not a valid name expression`));

  return freeze({ nameExpression, error });
}

export const NameExpressionBuild = freeze({
  make,
  visitToUndefined
});
