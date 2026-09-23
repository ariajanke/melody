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

import { Helpers } from '../src/helpers';
import { AstInitializerType, AstNode } from '../src/ast_node';
import { TokenFactories } from './token_factories';

const { freeze } = Helpers;
const makeToken = TokenFactories.makeFromStringOnly;
const makeFringe = (v: string): AstNode =>
  AstNode.forAstExpressionBuild.makeFringe(makeToken(v));
const { emptyTupleInstance } = AstNode.forAstExpressionBuild;
const makeCallWithNodes = AstNode.forAstExpressionBuild.makeCall;
function ensureFringe(node: string | AstNode): AstNode {
  return typeof node === 'string' ? makeFringe(node) : node;
}

const makeCall =
  (callName: string, receiver: string | AstNode, args: string | AstNode): AstNode =>
  makeCallWithNodes(makeToken(callName), ensureFringe(receiver), ensureFringe(args));

function makeFunctionDefinition(...nodes: Readonly<(string | AstNode)[]>): AstNode {
  return AstNode.forAstFunctionDefinitionBuild.
    makeFunctionDefinition(nodes.map(ensureFringe));
}

function makeInitializer
  (names: Readonly<string[]>, group: AstInitializerType, value: AstNode): AstNode
{
  return AstNode.forOperatorStripping.
    makeInitializer(names.map(makeToken), group, value);
}

export const AstFactories = freeze({
  makeFringe,
  makeCall,
  makeFunctionDefinition,
  makeTuple: AstNode.forOperatorStripping.makeTuple,
  emptyTupleInstance,
  makeInitializer
});
