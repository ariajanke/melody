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
    makeFunctionDefinition: IastDefinition.make,
    makeTuple: IastTuple.make,
    makeLetDeclation: IastLet.make,
    makeCall : IastCall.make,
    tokenize: IastFringe.tokenize,
    emptyTupleInstance,
    makeContextNodeAt: IastFringe.makeContextNodeAt,
  },
  forIastExpressionBuild: {
    emptyTupleInstance,
    tuplify: IastTuple.tuplify,
    makeCall : IastCall.make,
    makeLetDeclation: IastLet.make,
    makeFringe: IastFringe.make,
  },
  forIastFunctionDefinitionBuild: {
    makeFunctionDefinition: IastDefinition.make,
  }
});
