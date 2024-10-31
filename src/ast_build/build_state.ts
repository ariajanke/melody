import { type TreePartBuild } from './tree_part_build';
import { AstTupleNode } from '../ast_tuple_node';
import { AstNode } from '../ast_node';
import { Helpers } from '../helpers';
import { OperativeStatementBuilder } from '../operative_statement_builder';
import { Token } from '../token';
import { OperativeStatementAstCreation } from './operative_statement_ast_creation';

const { freeze } = Helpers;

export const BuildState = freeze({
  make:
    (mErrors: Readonly<{ message: string }>[] = []) => {
    const mBuildParts: TreePartBuild[] = [];

    const mLineNodes: AstNode[] = [];
    const mStatementBuilders = [OperativeStatementBuilder.make()];
    const lastStatementBuilder = () =>
      mStatementBuilders[mStatementBuilders.length - 1] ??
      (() => { throw new Error('All group frames already popped'); }) ();
    const inst = freeze({
      hasRemainingParts: () => mBuildParts.length > 0,
      pushPart: (buildPart: TreePartBuild) => {
        mBuildParts.push(buildPart);
        return inst;
      },
      popPart: () =>
        mBuildParts.pop() ?? (() => { throw new Error('no parts remain'); })(),
      pushToken: (token: Token, operandRelation: string) => {
        lastStatementBuilder().pushToken(token, operandRelation);
        return inst;
      },
      pushNode: (node: AstNode) => {
        lastStatementBuilder().pushNode(node);
        return inst;
      },
      pushGrouping: () => {
        mStatementBuilders.push(OperativeStatementBuilder.make());
        return inst;
      },
      popGrouping: (fn: (node: AstNode) => AstNode | undefined) => {
        const lastBuilder = lastStatementBuilder();
        mStatementBuilders.pop();
        const visitor = OperativeStatementAstCreation.make();
        const { rootVisitable, isEmpty, error } = lastBuilder.completion();
        const osvNode = rootVisitable();
        if (osvNode) {
          osvNode.visit(visitor);
          const node = fn( visitor.finish() );
          if (node) {
            inst.pushNode(node);
          }
        } else if (!isEmpty()) {
          mErrors.push(error());
        }
        return inst;
      },
      pushNewLine: () => {
        const lastBuilder = lastStatementBuilder();
        const { rootVisitable, isEmpty, error } = lastBuilder.completion();
        const osv = rootVisitable();
        mStatementBuilders.pop();
        if (osv) {
          const visitor = OperativeStatementAstCreation.make();
          osv.visit(visitor);
          mLineNodes.push(visitor.finish());
        } else if (!isEmpty()) {
          mErrors.push(error());
        }
        mStatementBuilders.push(OperativeStatementBuilder.make());
        return inst;
      },
      complete: () => {
        const { rootVisitable, isEmpty, error } = lastStatementBuilder().completion();
        const osv = rootVisitable();
        if (osv) {
          const visitor = OperativeStatementAstCreation.make();
          osv.visit(visitor);
          mLineNodes.push(visitor.finish());
        } else if (!isEmpty()) {
          mErrors.push(error());
        }
        return AstTupleNode.make('\n', mLineNodes);
      }
    });
    return inst;
  }
});
export type BuildState = ReturnType<typeof BuildState.make>;
