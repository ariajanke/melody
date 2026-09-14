import { Helpers } from '../src/helpers';
import { IastNode } from '../src/iast_node';
import { TokenFactories } from './token_factories';

const { freeze } = Helpers;
const makeToken = TokenFactories.makeFromStringOnly;
const makeFringe = (v: string): IastNode =>
  IastNode.forIastExpressionBuild.makeFringe(makeToken(v));
const { makeLetDeclation } = IastNode.forIastExpressionBuild;
const makeCallWithNodes = IastNode.forIastExpressionBuild.makeCall;
function ensureFringe(node: string | IastNode): IastNode {
  return typeof node === 'string' ? makeFringe(node) : node;
}
const makeLetEquals = (name: string | IastNode, value: string | IastNode): IastNode =>
  makeLetDeclation(
    makeCallWithNodes(makeToken('='), ensureFringe(name), ensureFringe(value))
  );

const makeCall =
  (callName: string, receiver: string | IastNode, args: string | IastNode): IastNode =>
  makeCallWithNodes(makeToken(callName), ensureFringe(receiver), ensureFringe(args));

const letAEqual1 = (): IastNode => makeLetEquals('a', '1');

function makeFunctionDefinition(...nodes: Readonly<(string | IastNode)[]>): IastNode {
  return IastNode.forIastFunctionDefinitionBuild.makeFunctionDefinition(nodes.map(ensureFringe));
}

export const IastFactories = freeze({
  letAEqual1,
  makeFringe,
  makeLetEquals,
  makeCall,
  makeFunctionDefinition,
  makeTuple: IastNode.forOperatorStripping.makeTuple,
  emptyTupleInstance: IastNode.forIastExpressionBuild.emptyTupleInstance
});
