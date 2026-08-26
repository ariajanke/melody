import { Token } from '../token';

export type IastLiteralType = 'string' | 'number';

export interface IastVisitor_<ResultType = void> {
  // visitString(v: string): ResultType;
  // visitInteger(v: string): ResultType;
  visitLiteral(token: Token, type: IastLiteralType): ResultType;
  visitFringe(token: Token): ResultType;
  visitTuple(nodes: Readonly<IastNode_[]>): ResultType;
  visitLet(innerNode: IastNode_): ResultType;
  visitCall(callName: Token, receiver: IastNode_, args: IastNode_): ResultType;
  visitFunctionDefinition(nodes: Readonly<IastNode_[]>): ResultType;
}

// IAST: Initial Abstract Syntax Tree
export interface IastNode_ {
  asString(): string;
  visit<T>(visitor: IastVisitor_<T>): T;
};
