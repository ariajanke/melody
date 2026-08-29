import { Helpers } from '../../helpers';
import {
  OperatorDefinitions,
  OperatorDefinition,
  type OperatorDefinitionDictionary
} from '../operator_definitions';
import { type Token } from '../../token';
import { type OrganizationNodeTypeInfo } from './organization_node_type_info';
import { OrganizationNodeSlot } from './organization_node_slot';
import { type PrecedenceOrganizationNode } from './precedence_organization_node';
import { VisitableNodeDatum } from './visitable_node_datum';

type NodeTypeInfo = OrganizationNodeTypeInfo;
type NodeSlot = OrganizationNodeSlot;
type MakeNodeFn = (index: number) => NodeSlot;
type NodeTypeInfoConstructor =
  (mMakeLow: MakeNodeFn,
   mMakeHigh: MakeNodeFn,
   mPrecedence: number) => NodeTypeInfo;

const { memoize, freeze } = Helpers;

export const NodeTypeInfoInstance = freeze({
  makeFunctions: (constructor: NodeTypeInfoConstructor) => {
    const instancesOnBinaryOperators =
      memoize(() => makeInstancesOnOperatorListing(OperatorDefinitions.binaryListing));

    const instancesOnUnaryOperators =
      memoize(() => makeInstancesOnOperatorListing(OperatorDefinitions.unaryListing));

    const makeToDict = (low: MakeNodeFn, high: MakeNodeFn) =>
      (def: OperatorDefinition): Readonly<{ [rep: string]: NodeTypeInfo }> =>
        freeze({ [def.representation]: constructor(low, high, def.precedence) });

    const fallBackInstance = memoize((): NodeTypeInfo => {
      const { makeNull } = OrganizationNodeSlot;
      return constructor(makeNull, makeNull, fallbackDefinition().precedence);
    });

    const fallbackDefinition: () => OperatorDefinition = memoize(() => freeze({
      representation: '<FRINGE>',
      operandRelation: '<NONE>',
      precedence: Math.max(
        ...OperatorDefinitions.
          fullListing().
          map((def: OperatorDefinition) => def.precedence)
      )
    }));

    function makeInstancesOnOperatorListing
      (fn: () => OperatorDefinitionDictionary): Readonly<{ [representation: string]: NodeTypeInfo }>
    { 
      const { makeLeft, makeRight, makeWriteOnly } = OrganizationNodeSlot;
      const fringe = freeze({ [fallbackDefinition().representation]: fallBackInstance() });
      const makeBinary = makeToDict(makeLeft, makeRight);
      const makeUnary = makeToDict(makeWriteOnly, makeRight);
      const dict = fn();
      const { unary, binary } = OperatorDefinitions.operandRelationships;
      const asArray = Object.keys(dict).map((representation: string) => {
        const def: OperatorDefinition | undefined = dict[representation];
        if (def!.operandRelation === unary) {
          return makeUnary(def as OperatorDefinition);
        } else if (def!.operandRelation === binary) {
          return makeBinary(def as OperatorDefinition);
        }
        return fringe;
      });
      return Object.assign({} as { [representation: string]: NodeTypeInfo }, ...asArray);
    };

    const makeIntermediateNodeWith =
      (instances: () => Readonly<{ [representation: string]: NodeTypeInfo }>) =>
      (token: Token, index: number): PrecedenceOrganizationNode =>
    {
      const primaryInst = instances()[token.content()];
      const inst = (primaryInst ?? fallBackInstance()) satisfies NodeTypeInfo;
      return inst.makeIntermediateNode(VisitableNodeDatum.makeForToken(token), index);
    };

    return freeze({
      makeIntermediateNodeForBinary:
        makeIntermediateNodeWith(instancesOnBinaryOperators),
      makeIntermediateNodeForUnary:
        makeIntermediateNodeWith(instancesOnUnaryOperators),
      fallBackInstance
    });
  }
});
