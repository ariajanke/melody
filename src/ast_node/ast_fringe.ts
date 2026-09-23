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

import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, raise } from '../helpers';
import { Token } from '../token';
import { AstDefinition } from './ast_other_nodes';
import { AstNode_, AstVisitor_ } from './ast_types';

const { freeze, memoize } = Helpers;

const kIsFringe = Symbol();

interface AstFringeNode extends AstNode_ {
  kIsFringe: symbol;
  asToken(): Token;
};

function chooseVisitorFor(token: Token)
  : <T>(v: AstVisitor_<T>) => T
{
  const tokenTypes = Token.types;
  switch (token.type()) {
  case tokenTypes.identifier:
  case tokenTypes.operator:
    return <T>(v: AstVisitor_<T>): T => v.visitFringe(token);
  case tokenTypes.literal.string:
    return <T>(v: AstVisitor_<T>): T => v.visitLiteral(token, 'string');
  case tokenTypes.literal.numeric:
    return <T>(v: AstVisitor_<T>): T => v.visitLiteral(token, 'number');
  default:
    raise(`cannot build stringable node from token "${token.content()}"`);
  }
}

function tokenize(node: AstFringeNode | AstNode_): Token | undefined {
  if ('kIsFringe' in node && node.kIsFringe === kIsFringe)
    { return node.asToken(); }

  return undefined;
}

const contentTokenBase = memoize((): Token => freeze({
  start  : (): number => raise('define me'),
  end    : (): number => raise('define me'),
  content: () => FunctionNamingSchema.kContextName,
  type   : () => Token.types.identifier
}));

export const AstFringe = freeze({
  tokenize,
  makeContextNodeAt(mCallName: Token) {
    const contentToken = freeze({
      ...contentTokenBase(),
      start  : mCallName.start,
      end    : mCallName.end  ,
    });
    return AstFringe.make(contentToken);
  },
  make(mToken: Token): AstFringeNode {
    return freeze({
      kIsFringe,
      asString: () => mToken.content(),
      asToken: () => mToken,
      visit: chooseVisitorFor(mToken),
      uid: AstDefinition.makeUid()
    });
  }
});
