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

import { Helpers } from './helpers';
import { AstFringe } from './ast_node/ast_fringe';
import { AstCall, AstDefinition, AstInitializer } from './ast_node/ast_other_nodes';
import { AstTuple } from './ast_node/ast_tuple';
import {
  AstInitializerType_,
  AstLiteralType_,
  AstNode_,
  AstVisitor_
} from './ast_node/ast_types';

const { freeze, memoize } = Helpers;
const emptyTupleInstance = memoize(AstTuple.make);

export type AstLiteralType = AstLiteralType_;
export type AstNode = AstNode_;
export type AstInitializerType = AstInitializerType_;
export type AstVisitor<T = void> = AstVisitor_<T>;

export const AstNode = freeze({
  forOperatorStripping: {
    emptyTupleInstance,
    makeCall : AstCall.make,
    makeContextNodeAt: AstFringe.makeContextNodeAt,
    makeFunctionDefinition: AstDefinition.make,
    makeInitializer: AstInitializer.make,
    makeTuple: AstTuple.make,
    tokenize: AstFringe.tokenize,
  },
  forAstExpressionBuild: {
    emptyTupleInstance,
    makeCall : AstCall.make,
    makeFringe: AstFringe.make,
    makeInitializer: AstInitializer.make,
    tuplify: AstTuple.tuplify,
  },
  forAstFunctionDefinitionBuild: {
    makeFunctionDefinition: AstDefinition.make,
  }
});
