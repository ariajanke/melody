import { type PrecedenceOrganizationNode } from './precedence_organization_node';
import { Helpers } from '../helpers';

const { freeze } = Helpers;

export interface OrganizationNodeSlot {
  set: (otherInstances: PrecedenceOrganizationNode[], o: PrecedenceOrganizationNode) => void,
  get: (otherInstances: PrecedenceOrganizationNode[]) => PrecedenceOrganizationNode | undefined,
  isPresent: () => boolean
}

const class_ = freeze({
  makeAt: (mIndex: number) => freeze({
    set: (otherInstances: PrecedenceOrganizationNode[], o: PrecedenceOrganizationNode) =>
      { otherInstances[mIndex] = o; },
    get: (otherInstances: PrecedenceOrganizationNode[]) =>
      otherInstances[mIndex],
    isPresent: () => true,
    index: mIndex
  }),

  makeWriteOnly: (mIndex: number) => freeze({
    set: (otherInstances: PrecedenceOrganizationNode[], o: PrecedenceOrganizationNode) =>
      { otherInstances[mIndex] = o; },
    get: (_0: PrecedenceOrganizationNode[]) => undefined,
    isPresent: () => true
  }),

  makeLeft: (mIndex: number) =>
    class_.makeAt(mIndex - 1),

  makeRight: (mIndex: number) =>
    class_.makeAt(mIndex + 1),

  makeNull: (_0: number) => freeze({
    set: (_0: PrecedenceOrganizationNode[], _1: PrecedenceOrganizationNode) =>
      {},
    get: (_0: PrecedenceOrganizationNode[]) => undefined,
    isPresent: () => false
  })
});

export const OrganizationNodeSlot = class_;