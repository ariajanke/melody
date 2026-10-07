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

import { Token } from '../token';

export type AstLiteralType_ = 'string' | 'number';
export type AstInitializerQualifier_ = '=' | ':=';

/// Abstract Syntax Tree
/// schema:
/// <calls> are generally stripped, but maybe present if a name (identifier) 
/// was not found for them. Assignment operators are stripped, operators found
/// immediately under lets will remain. All dots are removed without exception.
export interface AstNode_ {
  asString(): string;
  visit<T>(visitor: AstVisitor_<T>): T;
  uid(): number;
};

export interface AstInitializerExpression_ {
  readonly names: Readonly<Token[]>;
  readonly typeNode?: AstNode_;
  readonly qualifier: AstInitializerQualifier_;
  readonly valueNode: AstNode_;
};

export interface AstParameterExpression_ {
  readonly names: Readonly<Token[]>;
  readonly typeNode: AstNode_;
};

export interface AstDefinitionNode_ extends AstNode_ {
  readonly parameters: Readonly<AstParameterExpression_[]>;
  readonly nodes: Readonly<AstNode_[]>;
};

export interface AstLiteralNode_ extends AstNode_ {
  readonly token: Token;
  readonly type : AstLiteralType_;
};

interface AstIdentifierNode_ extends AstNode_ {
  readonly token: Token;
};

interface AstTupleNode_ extends AstNode_ {
  readonly nodes: Readonly<AstNode_[]>;
};

interface AstCallNode_ extends AstNode_ {
  readonly callName: Token;
  readonly receiver: AstNode_;
  readonly parameters: AstNode_;
}

export interface AstVisitor_<ResultType = void> {
  visitLiteral(token: Token, type: AstLiteralType_): ResultType;
  visitFringe(token: Token): ResultType;
  visitTuple(nodes: Readonly<AstNode_[]>): ResultType;
  visitInitializer(initializer: AstInitializerExpression_): ResultType;
  visitCall(callName: Token, receiver: AstNode_, args: AstNode_): ResultType;
  visitFunctionDefinition(defNode: AstDefinitionNode_): ResultType;
};

