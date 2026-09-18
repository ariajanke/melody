import { Helpers } from './helpers';
import { AstFringe } from './ast_node/ast_fringe';
import { AstCall, AstDefinition, AstInitializer } from './ast_node/ast_other_nodes';
import { AstTuple } from './ast_node/ast_tuple';
import {
  AstInitializerType_,
  AstLiteralType_,
  AstNode_,
  AstVisitor_
} from './ast_node/ast_types';

const { freeze, memoize } = Helpers;
const emptyTupleInstance = memoize(AstTuple.make);

export type AstLiteralType = AstLiteralType_;
export type AstNode = AstNode_;
export type AstInitializerType = AstInitializerType_;
export type AstVisitor<T = void> = AstVisitor_<T>;

export const AstNode = freeze({
  forOperatorStripping: {
    emptyTupleInstance,
    makeCall : AstCall.make,
    makeContextNodeAt: AstFringe.makeContextNodeAt,
    makeFunctionDefinition: AstDefinition.make,
    makeInitializer: AstInitializer.make,
    makeTuple: AstTuple.make,
    tokenize: AstFringe.tokenize,
  },
  forAstExpressionBuild: {
    emptyTupleInstance,
    makeCall : AstCall.make,
    makeFringe: AstFringe.make,
    makeInitializer: AstInitializer.make,
    tuplify: AstTuple.tuplify,
  },
  forAstFunctionDefinitionBuild: {
    makeFunctionDefinition: AstDefinition.make,
  }
});
