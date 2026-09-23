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
export type AstInitializerType_ = '=' | ':=';

// this would go into initializers, definitions, 
interface AstNameExpression {
  list: Readonly<Token[]>;
  isSubExpression?: AstNode_;
};

export interface AstVisitor_<ResultType = void> {
  visitLiteral(token: Token, type: AstLiteralType_): ResultType;
  visitFringe(token: Token): ResultType;
  visitTuple(nodes: Readonly<AstNode_[]>): ResultType;
  visitInitializer(
    names: Readonly<Token[]>,
    group: AstInitializerType_,
    value: AstNode_): ResultType;
  visitCall(callName: Token, receiver: AstNode_, args: AstNode_): ResultType;
  visitFunctionDefinition(uid: number, nodes: Readonly<AstNode_[]>): ResultType;
};

/// IAST: Initial Abstract Syntax Tree
/// schema:
/// <calls> are generally stripped, but maybe present if a name (identifier) 
/// was not found for them. Assignment operators are stripped, operators found
/// immediately under lets will remain. All dots are removed without exception.
export interface AstNode_ {
  asString(): string;
  visit<T>(visitor: AstVisitor_<T>): T;
  uid(): number;
};
