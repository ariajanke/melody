import { Helpers, StandardError } from '../../helpers';
import { IastNode, IastVisitor } from '../../iast_node';
import { IastLiteralType } from '../../iast_node/iast_types';
import { Token } from '../../token';

const { freeze, memoize } = Helpers;

export const NamingExpressionResult = freeze({
  makeErroneousWithMessage(message: string) {
    return freeze({
      names: () => undefined,
      error: memoize(() => freeze({ message }))
    }) satisfies NamingExpressionResult;
  },
  make(collection: string[]) {
    const { error } = StandardError.make();
    return freeze({
      names: (): Readonly<string[]> | undefined => collection,
      error
    });
  }
});
export type NamingExpressionResult = ReturnType<typeof NamingExpressionResult.make>;

const noVisitCall = (_0: Token, _1: IastNode, _2: IastNode) =>
  NamingExpressionResult.makeErroneousWithMessage(`function call not allowed`);
const noVisitLetDeclaration = (_0: IastNode) =>
  NamingExpressionResult.makeErroneousWithMessage('nested lets not allowed');
const noVisitFunctionDefinition = (_0: Readonly<IastNode[]>) =>
  NamingExpressionResult.makeErroneousWithMessage('function defs not allowed');
const noVisitLiteral = (token: Token, type: IastLiteralType) =>
  NamingExpressionResult.
    makeErroneousWithMessage(`Literal (${type}) "${token.content()} not allowed`);
const visitFringe = (v: Token) => NamingExpressionResult.make([v.content()]);
const noVisitTuple = (_0: Readonly<IastNode[]>) =>
  NamingExpressionResult.makeErroneousWithMessage('Cannot handle nested tuples');

export const NamingExpressionVisitor = freeze({
  make(): IastVisitor<NamingExpressionResult> {
    const inst = freeze({
      visitCall: noVisitCall,
      visitLet: noVisitLetDeclaration,
      visitFunctionDefinition: noVisitFunctionDefinition,
      visitLiteral: noVisitLiteral,
      visitFringe,
      visitTuple(nodes: Readonly<IastNode[]>) {
        const names: string[] = [];
        const deeperVisitor = freeze({
          visitCall: noVisitCall,
          visitLet: noVisitLetDeclaration,
          visitFunctionDefinition: noVisitFunctionDefinition,
          visitLiteral: noVisitLiteral,
          visitFringe(v: Token)
            { names.push(v.content()); },
          visitTuple: noVisitTuple
        }) satisfies IastVisitor;
        nodes.forEach(v => v.visit<void>(deeperVisitor));
        return NamingExpressionResult.make(names);
      }
    });
    return inst;
  }
});
