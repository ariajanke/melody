import { Helpers } from '../helpers';
import { OperativeStatementBuilder } from '../operative_statement_builder';
import { OperativeStatementAstCreation } from './operative_statement_ast_creation';
import { AstNode } from '../ast_node';
import { Token } from '../token';
import { AstFunctionDefinitionNode } from '../ast_function_definition_node';

const { freeze } = Helpers;

let sPrintOutCompletions = false;

export const BlockBuilder = freeze({
  setPrintOutCompletionsEnabled: (b: boolean) => {
    sPrintOutCompletions = b;
  },
  make: (mErrors: Readonly<{ message: string }>[] = []) => {
    const mLineNodes: AstNode[] = [];
    const mStatementBuilders = [OperativeStatementBuilder.make()];
    const throwAlreadyPopped = () =>
      { throw new Error('All group frames already popped'); };
    const lastStatementBuilder = () =>
      mStatementBuilders[mStatementBuilders.length - 1] ??
      throwAlreadyPopped();
    const lineNodesAsString = () => {
      let s = 'lines<';
      mLineNodes.forEach((node: AstNode) => {
        s = `${s} ${node.asString()}, `
      });
      return `${s}>`;
    };
    const inst = freeze({
      pushToken: (token: Token, operandRelation: string) => {
        lastStatementBuilder().pushToken(token, operandRelation);
        return inst;
      },
      pushNode: (node: AstNode) => {
        lastStatementBuilder().pushNode(node);
        return inst;
      },
      pushStatement: () => {
        mStatementBuilders.push(OperativeStatementBuilder.make());
        return inst;
      },
      popStatement: (fn: (node: AstNode) => AstNode | undefined) => {
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
          popStatement((node: AstNode) => {
            mLineNodes.push( node );
            return undefined;
          }).
          pushStatement(),
      statementCount: () => mStatementBuilders.length,
      complete: () => {
        inst.popStatement((node: AstNode) => {
          mLineNodes.push(node);
          return undefined;
        });
        if (sPrintOutCompletions) {
          console.log(lineNodesAsString());
        }
        if (mStatementBuilders.length !== 0) {
          throw new Error(`there are still statement builders left`);
        }
        return AstFunctionDefinitionNode.make(mLineNodes);
      }
    });
    return inst;
  }
});
export type BlockBuilder = ReturnType<typeof BlockBuilder.make>;
