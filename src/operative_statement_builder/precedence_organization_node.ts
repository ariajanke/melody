import { Helpers } from '../helpers';
import {
  type OperativeStatementVisitable,
  type OperativeStatementVisitor
} from '../operative_statement_builder';
import { OrganizationNodeSlot } from './organization_node_slot';
import { OrganizationNodeTypeInfo } from './organization_node_type_info';
import { type VisitableNodeDatum } from './visitable_node_datum';

interface LinkedInstances {
  low : PrecedenceOrganizationNode | undefined,
  high: PrecedenceOrganizationNode | undefined
};

type Instance = PrecedenceOrganizationNode;
type NodeTypeInfo = OrganizationNodeTypeInfo;

export interface NodeValidationVisitor {
  validate: (low : PrecedenceOrganizationNode | undefined,
             datum: VisitableNodeDatum,
             high: PrecedenceOrganizationNode | undefined) => void
};

export interface PrecedenceOrganizationNode extends OperativeStatementVisitable {
  lowSlot: () => OrganizationNodeSlot,
  highSlot: () => OrganizationNodeSlot,
  compare: (s: PrecedenceOrganizationNode) => number,
  compareToInfo: (nodeInfo: OrganizationNodeTypeInfo) => number,
  possessExtremesOn:
    (otherInstances: PrecedenceOrganizationNode[]) => PrecedenceOrganizationNode,
  asString: () => string
};

const { freeze, memoize } = Helpers;

const nullLink: LinkedInstances = freeze({ low: undefined, high: undefined });

const presentSlot = (lhs: OrganizationNodeSlot | undefined, rhs: OrganizationNodeSlot) =>
  lhs?.isPresent() ? lhs: rhs;

const nullVisitableInstance: OperativeStatementVisitable = freeze({
  visit: (_0: OperativeStatementVisitor) => {},
  uniqueIdentifier: memoize(Symbol),
});

const make =
  (mVisitable: VisitableNodeDatum,
   mNodeInfo: NodeTypeInfo,
   mLow: OrganizationNodeSlot,
   mHigh: OrganizationNodeSlot,
   mLinks_?: Readonly<LinkedInstances> | undefined) =>
{
  const mLinks = mLinks_ ?? nullLink;
  const makeLinksFromExtremes = (otherInstances: Instance[]) => freeze({
    low : mLow .get(otherInstances),
    high: mHigh.get(otherInstances)
  });
  mVisitable.uniqueIdentifier();
  const inst = freeze({
    compare: (other: Instance) =>
      -other.compareToInfo(mNodeInfo),
    compareToInfo: (nodeInfo: NodeTypeInfo) =>
      -nodeInfo.compare(mNodeInfo),
    visit: (visitor: OperativeStatementVisitor) =>
      visitor.
        visitLinks(mLinks.low ?? nullVisitableInstance,
                   mVisitable,
                   mLinks.high ?? nullVisitableInstance ),
    lowSlot: () => mLow,
    highSlot: () => mHigh,
    asString: mVisitable.asString,
    uniqueIdentifier: mVisitable.uniqueIdentifier,
    possessExtremesOn: (otherInstances: Instance[]) => {
      const links = makeLinksFromExtremes(otherInstances);
      const newInst =
        make(mVisitable,
             mNodeInfo,
             presentSlot(links.low ?.lowSlot (), mLow ),
             presentSlot(links.high?.highSlot(), mHigh),
             links);
      newInst.lowSlot ().set(otherInstances, newInst);
      newInst.highSlot().set(otherInstances, newInst);
      return newInst;
    }
  });
  return inst;
};

export const PrecedenceOrganizationNode = freeze({
  workCollection: (collection: PrecedenceOrganizationNode[]):
    PrecedenceOrganizationNode | undefined =>
  {
    const processOrder = [...collection].
      sort((a: Instance, b: Instance) => -a.compare(b));
    processOrder.map((n: Instance) => n.possessExtremesOn(collection));
    return collection[0];
  },
  isNullVisitable: (vnd: OperativeStatementVisitable) =>
    nullVisitableInstance.uniqueIdentifier() === vnd.uniqueIdentifier(),
  make
});
