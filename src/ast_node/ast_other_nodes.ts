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

import { Helpers } from '../helpers';
import { Token } from '../token';
import {
  AstInitializerExpression_,
  AstNode_,
  AstParameterExpression_,
  AstVisitor_
} from './ast_types';

const { freeze, memoize } = Helpers;

const makeUid = (() => {
  const counter = Helpers.makeCounter();

  return () => memoize(counter);
})();

export const AstDefinition = freeze({
  makeUid,
  make(
    parameters: Readonly<AstParameterExpression_[]>,
    nodes: Readonly<AstNode_[]>): AstNode_
  {
    const uid = makeUid();
    return freeze({
      asString: () =>
        `Definition { ${nodes.map(v => v.asString()).join(', ')} }`,
      visit: <T>(v: AstVisitor_<T>) =>
        v.visitFunctionDefinition(uid(), parameters, nodes),
      uid
    });
  }
});

export const AstInitializer = freeze({
  make(mNameExpression: AstInitializerExpression_): AstNode_ {
    return freeze({
      asString: () => {
        const { names, qualifier, valueNode } = mNameExpression;
        return `Initializer { (${names.join(', ')}) ${qualifier} ${valueNode.asString()} }`;
      },
      visit: <T>(v: AstVisitor_<T>) =>
        v.visitInitializer(mNameExpression),
      uid: makeUid()
    });
  }
});

export const AstCall = freeze({
  make(callName: Token, receiver: AstNode_, args: AstNode_): AstNode_ {
    return freeze({
      asString: () =>
        `Call { name: ${callName.content()}, ` +
        `receiver: ${receiver.asString()}, ` +
        `args: ${args.asString()} }`,
      visit: <T>(v: AstVisitor_<T>) =>
        v.visitCall(callName, receiver, args),
      uid: makeUid()
    });
  }
});
