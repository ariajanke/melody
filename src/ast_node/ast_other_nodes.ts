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
import { AstInitializerType_, AstNode_, AstVisitor_ } from './ast_types';

const { freeze, memoize } = Helpers;

const makeUid = (() => {
  const counter = Helpers.makeCounter();

  return () => memoize(counter);
})();

export const AstDefinition = freeze({
  makeUid,
  make(nodes: AstNode_[]): AstNode_ {
    const uid = makeUid();
    return freeze({
      asString: () =>
        `Definition { ${nodes.map(v => v.asString()).join(', ')} }`,
      visit: <T>(v: AstVisitor_<T>) =>
        v.visitFunctionDefinition(uid(), nodes),
      uid
    });
  }
});

export const AstInitializer = freeze({
  make(
    mNames: Readonly<Token[]>,
    mGroup: AstInitializerType_,
    mValue: AstNode_): AstNode_
  {
    return freeze({
      asString: () => `Initializer { (${mNames.join(', ')}) ${mGroup} ${mValue.asString()} }`,
      visit: <T>(v: AstVisitor_<T>) =>
        v.visitInitializer(mNames, mGroup, mValue),
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
