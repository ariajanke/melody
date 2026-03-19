import { Helpers } from '../../helpers';
import { Token } from '../../token';
import { OperatorDefinitions } from '../operator_definitions';
import { OrganizationNodeSlot } from './organization_node_slot';
import { PrecedenceOrganizationNode } from './precedence_organization_node';
import { VisitableNodeDatum } from './visitable_node_datum';
import { NodeTypeInfoInstance } from './node_type_info_instances';
import { IastNode } from '../../iast_node';

type NodeSlot = OrganizationNodeSlot;

type MakeNodeFn = (index: number) => NodeSlot;

interface NodeTypeInfo {
  makeIntermediateNode:
    (mVisitable: VisitableNodeDatum,
     index: number) => PrecedenceOrganizationNode,
  compare: (other: NodeTypeInfo) => number,
  comparePrecedenceIndex: (index: number) => number
};

const { freeze, memoize } = Helpers;

const make = (mMakeLow: MakeNodeFn,
              mMakeHigh: MakeNodeFn,
              mPrecedence: number): NodeTypeInfo =>
{
  const inst = freeze({
    makeIntermediateNode: (mVisitable: VisitableNodeDatum, index: number) =>
      PrecedenceOrganizationNode.
        make(mVisitable, inst, mMakeLow(index), mMakeHigh(index)),
    compare: (other: NodeTypeInfo) =>
      -other.comparePrecedenceIndex(mPrecedence),
    comparePrecedenceIndex: (index: number) =>
      mPrecedence - index
  });
  return inst;
};

const {
  fallBackInstance,
  makeIntermediateNodeForBinary,
  makeIntermediateNodeForUnary
} = NodeTypeInfoInstance.makeFunctions(make);

const someMap:
  () => { [name: string]: (token: Token, index: number) => PrecedenceOrganizationNode }
  =
memoize(() => freeze({
  [OperatorDefinitions.operandRelationships.binary]: makeIntermediateNodeForBinary,
  [OperatorDefinitions.operandRelationships.unary ]: makeIntermediateNodeForUnary ,
  [OperatorDefinitions.operandRelationships.fringe]: (token: Token, index: number) =>
    fallBackInstance().
    makeIntermediateNode(VisitableNodeDatum.makeForToken(token), index)
}));

const class_ = freeze({
  forTesting: {
    onFallback: memoize(() =>
      (token: Token, index: number) =>
        fallBackInstance().makeIntermediateNode(VisitableNodeDatum.makeForToken(token), index))
  },
  onOperandRelation: (operandRelation: string):
    (token: Token, index: number) => PrecedenceOrganizationNode =>
    someMap()[operandRelation] ??
    (() => { throw new Error(`"${operandRelation}" is not an operand relation`); })(),
  makeIntermediateNodeForNode: (node: IastNode, index: number): PrecedenceOrganizationNode => {
    const inst = fallBackInstance();
    return inst.makeIntermediateNode(VisitableNodeDatum.makeForNode(node), index);
  },
  make
});
  
export const OrganizationNodeTypeInfo = class_;
export type OrganizationNodeTypeInfo = NodeTypeInfo;
