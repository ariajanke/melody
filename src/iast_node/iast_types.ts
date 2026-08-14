import { Token } from '../token';

export type IastLiteralType_ = 'string' | 'number';

export interface IastVisitor_<ResultType = void> {
  visitLiteral(token: Token, type: IastLiteralType_): ResultType;
  visitFringe(token: Token): ResultType;
  visitTuple(nodes: Readonly<IastNode_[]>): ResultType;
  visitLet(innerNode: IastNode_): ResultType;
  visitCall(callName: Token, receiver: IastNode_, args: IastNode_): ResultType;
  visitFunctionDefinition(nodes: Readonly<IastNode_[]>): ResultType;
};

/// IAST: Initial Abstract Syntax Tree
/// schema:
/// <calls> are generally stripped, but maybe present if a name (identifier) 
/// was not found for them. Assignment operators are stripped, operators found
/// immediately under lets will remain. All dots are removed without exception.
export interface IastNode_ {
  asString(): string;
  visit<T>(visitor: IastVisitor_<T>): T;
};
