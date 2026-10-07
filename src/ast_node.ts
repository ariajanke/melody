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
  AstCallNode_,
  AstDefinitionNode_,
  AstIdentifierNode_,
  AstInitializerNode_,
  AstInitializerQualifier_,
  AstLiteralNode_,
  AstLiteralType_,
  AstNode_,
  AstParameterExpression_,
  AstTupleNode_,
  AstVisitor_
} from './ast_node/ast_types';

const { freeze, memoize } = Helpers;
const emptyTupleInstance = memoize(AstTuple.make);

export type AstLiteralType = AstLiteralType_;
export type AstInitializerQualifier = AstInitializerQualifier_;
export type AstParameterExpression = AstParameterExpression_;

export type AstNode = AstNode_;
export type AstInitializerNode = AstInitializerNode_;
export type AstDefinitionNode = AstDefinitionNode_;
export type AstLiteralNode = AstLiteralNode_;
export type AstIdentifierNode = AstIdentifierNode_;
export type AstTupleNode = AstTupleNode_;
export type AstCallNode = AstCallNode_;

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
    mergeTuple: AstTuple.mergeBoth,
    mergeTupleLeft: AstTuple.mergeLeft,
    mergeTupleRight: AstTuple.mergeRight,
    makeTuple: AstTuple.make
  },
  forAstFunctionDefinitionBuild: {
    makeFunctionDefinition: AstDefinition.make,
    detuplify: AstTuple.detuplify
  }
});
