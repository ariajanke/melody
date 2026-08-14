import { Helpers } from './helpers';
import { IastFringe } from './iast_node/iast_fringe';
import { IastCall, IastDefinition, IastLet } from './iast_node/iast_other_nodes';
import { IastTuple } from './iast_node/iast_tuple';
import {
  IastLiteralType_,
  IastNode_,
  IastVisitor_
} from './iast_node/iast_types';

const { freeze, memoize } = Helpers;
const emptyTupleInstance = memoize(IastTuple.make);

export type IastLiteralType = IastLiteralType_;
export type IastNode = IastNode_;
export type IastVisitor<T = void> = IastVisitor_<T>;

export const IastNode = freeze({
  forOperatorStripping: {
    emptyTupleInstance,
    makeCall : IastCall.make,
    makeContextNodeAt: IastFringe.makeContextNodeAt,
    makeFunctionDefinition: IastDefinition.make,
    makeLetDeclation: IastLet.make,
    makeTuple: IastTuple.make,
    tokenize: IastFringe.tokenize,
  },
  forIastExpressionBuild: {
    emptyTupleInstance,
    makeCall : IastCall.make,
    makeFringe: IastFringe.make,
    makeLetDeclation: IastLet.make,
    tuplify: IastTuple.tuplify,
  },
  forIastFunctionDefinitionBuild: {
    makeFunctionDefinition: IastDefinition.make,
  }
});
