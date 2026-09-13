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

export type IastLiteralType = IastLiteralType_;
export type IastNode = IastNode_;
export type IastVisitor<T = void> = IastVisitor_<T>;

export const IastNode = freeze({
  emptyTupleInstance: memoize(IastTuple.make),
  makeFunctionDefinition: IastDefinition.make,
  makeFringe: IastFringe.make,
  forAssignmentStripping: {
    tokenize: IastFringe.tokenize,
    makeContextNodeAt: IastFringe.makeContextNodeAt,
    makeTuple: (node: IastNode) => IastTuple.make([node]),
    makeCall : IastCall.make,
    makeLetDeclation: IastLet.make
  },
  forLetDeclarationRetrievals: {
    makeTuple: IastTuple.make,
    detuplify: IastTuple.detuplify
  },
  forOperativeStatements: {
    makeContextNodeAt: IastFringe.makeContextNodeAt,
    makeCall: IastCall.make,
    tokenize: IastFringe.tokenize,
    tuplify: IastTuple.tuplify,
    makeLetDeclation: IastLet.make
  }
});
