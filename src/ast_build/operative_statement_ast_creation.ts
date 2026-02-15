import { Helpers } from '../helpers';
import { Token } from '../token';
import {
  type OperativeStatementVisitable,
  type OperativeStatementVisitor
} from './operative_statement_builder';
import { OperatorDefinitions } from './operator_definitions';
import { IastNode } from '../iast_node';

const { freeze } = Helpers;

export interface OperativeStatementAstCreation extends OperativeStatementVisitor {
  finish: () => IastNode
};

const {
  makeCall,
  tuplify,
  makeLetDeclation,
  makeOnContextCall
} = IastNode.forOperativeStatements;

export const OperativeStatementAstCreation = freeze({
  make: (): OperativeStatementAstCreation => {
    const mNodeStack: IastNode[] = [];
    const popOrThrow = () => {
      return mNodeStack.pop() ?? (() => { throw new Error('nodes depleted'); })();
    };
    const binaryOperator = (token: Token) => {
      const first = popOrThrow();
      const fcall = makeCall( token, popOrThrow(), first );
      mNodeStack.push(fcall);
    };
    const tupleOperator = (_0: Token) => {
      const first = popOrThrow();
      const second = popOrThrow();

      mNodeStack.push( tuplify(second, first) );
    };
    const letOperator = (_0: Token) => {
      mNodeStack.push(makeLetDeclation(popOrThrow()));
    };
    const functionCall = (_0: Token) => {
      const argsNode = popOrThrow();
      const nameNode = popOrThrow();
      const callNode = makeOnContextCall(nameNode, argsNode);
      mNodeStack.push(callNode);
    };

    const { binaryListing, unaryListing } = OperatorDefinitions;
    const mSpecialOperatorFactories: { [op: string]: typeof letOperator } = {
      [','  ]: tupleOperator ,
      ['let']: letOperator   ,
      [Token.kCallToken.content()]: functionCall
    };
    const inst = freeze({
      visitToken   : (token: Token) => {
        const opFactory = mSpecialOperatorFactories[token.content()];
        if (opFactory) {
          return opFactory(token);
        }
        if (binaryListing()[token.content()]) {
          return binaryOperator(token);
        }
        if (unaryListing()[token.content()]) {
          throw new Error('unimplemented');
        }

        mNodeStack.push(IastNode.makeFringe(token));
      },
      visitNode    : (node: IastNode) =>
        { mNodeStack.push(node); },
      visitLinks:
        (low: OperativeStatementVisitable,
         node: OperativeStatementVisitable,
         high: OperativeStatementVisitable) =>
      {
        low.visit(inst);
        high.visit(inst);
        node.visit(inst);
      },
      finish: (): IastNode => {
        const node = popOrThrow();
        if (mNodeStack.length !== 0) {
          throw new Error('uh oh');
        }
        return node;
      }
    });
    return inst;
  }
});
