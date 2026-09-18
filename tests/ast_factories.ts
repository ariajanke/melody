import { Helpers } from '../src/helpers';
import { AstInitializerType, AstNode } from '../src/ast_node';
import { TokenFactories } from './token_factories';

const { freeze } = Helpers;
const makeToken = TokenFactories.makeFromStringOnly;
const makeFringe = (v: string): AstNode =>
  AstNode.forAstExpressionBuild.makeFringe(makeToken(v));
const { emptyTupleInstance } = AstNode.forAstExpressionBuild;
const makeCallWithNodes = AstNode.forAstExpressionBuild.makeCall;
function ensureFringe(node: string | AstNode): AstNode {
  return typeof node === 'string' ? makeFringe(node) : node;
}

const makeCall =
  (callName: string, receiver: string | AstNode, args: string | AstNode): AstNode =>
  makeCallWithNodes(makeToken(callName), ensureFringe(receiver), ensureFringe(args));

function makeFunctionDefinition(...nodes: Readonly<(string | AstNode)[]>): AstNode {
  return AstNode.forAstFunctionDefinitionBuild.
    makeFunctionDefinition(nodes.map(ensureFringe));
}

function makeInitializer
  (names: Readonly<string[]>, group: AstInitializerType, value: AstNode): AstNode
{
  return AstNode.forOperatorStripping.
    makeInitializer(names.map(makeToken), group, value);
}

export const AstFactories = freeze({
  makeFringe,
  makeCall,
  makeFunctionDefinition,
  makeTuple: AstNode.forOperatorStripping.makeTuple,
  emptyTupleInstance,
  makeInitializer
});
