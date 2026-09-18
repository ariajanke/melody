import { Token } from '../token';

export type AstLiteralType_ = 'string' | 'number';
export type AstInitializerType_ = '=' | ':=';

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
