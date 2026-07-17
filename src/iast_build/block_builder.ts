import { Helpers, raise } from '../helpers';
import { OperativeStatementBuilder } from './operative_statement_builder';
import { OperativeStatementAstCreation } from './operative_statement_ast_creation';
import { IastNode } from '../iast_node';
import { Token } from '../token';

const { freeze } = Helpers;

let sPrintOutCompletions = false;

export const BlockBuilder = freeze({
  setPrintOutCompletionsEnabled: (b: boolean) => {
    sPrintOutCompletions = b;
  },
  make: (mErrors: Readonly<{ message: string }>[] = []) => {
    const mLineNodes: IastNode[] = [];
    const mStatementBuilders = [OperativeStatementBuilder.make()];
    const throwAlreadyPopped = () =>
      { raise('All group frames already popped'); };
    const lastStatementBuilder = () =>
      mStatementBuilders[mStatementBuilders.length - 1] ??
      throwAlreadyPopped();
    const lineNodesAsString = () => {
      let s = 'lines<';
      mLineNodes.forEach((node: IastNode) => {
        s = `${s} ${node.asString()}, `;
      });
      return `${s}>`;
    };
    const inst = freeze({
      pushToken: (token: Token, operandRelation: string) => {
        lastStatementBuilder().pushToken(token, operandRelation);
        return inst;
      },
      pushNode: (node: IastNode) => {
        lastStatementBuilder().pushNode(node);
        return inst;
      },
      pushStatement: () => {
        mStatementBuilders.push(OperativeStatementBuilder.make());
        return inst;
      },
      popStatement: (fn: (node: IastNode) => IastNode | undefined) => {
        const lastBuilder = mStatementBuilders.pop() ?? throwAlreadyPopped();
        const { rootVisitable, isEmpty, error } = lastBuilder.completion();
        const osvNode = rootVisitable();
        if (osvNode) {
          const visitor = OperativeStatementAstCreation.make();
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
      pushNewLine: () =>
        inst.
          popStatement((node: IastNode) => {
            mLineNodes.push( node );
            return undefined;
          }).
          pushStatement(),
      statementCount: () => mStatementBuilders.length,
      complete: () => {
        inst.popStatement((node: IastNode) => {
          mLineNodes.push(node);
          return undefined;
        });
        if (sPrintOutCompletions) {
          console.log(lineNodesAsString());
        }
        if (mStatementBuilders.length !== 0) {
          raise(`there are still statement builders left`);
        }
        return IastNode.makeFunctionDefinition(mLineNodes);
      }
    });
    return inst;
  }
});
export type BlockBuilder = ReturnType<typeof BlockBuilder.make>;
