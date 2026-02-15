import { Token } from '../token';
import { Helpers } from '../helpers';
import * as osb from './operative_statement_builder/precedence_organization_node';
import { OrganizationNodeTypeInfo } from './operative_statement_builder/organization_node_type_info';
import { OperativeStatementCompletion } from './operative_statement_completion';
import { IastNode } from '../iast_node';

const { freeze, memoize } = Helpers;

export const PrecedenceOrganizationNode = osb.PrecedenceOrganizationNode;
export type  PrecedenceOrganizationNode = osb.PrecedenceOrganizationNode;

export interface OperativeStatementVisitable {
  visit: (visitor: OperativeStatementVisitor) => void,
  uniqueIdentifier: () => symbol,
};

export interface OperativeStatementVisitor {
  visitToken   : (token: Token) => void,
  visitNode    : (node: IastNode) => void,
  visitLinks:
    (low: OperativeStatementVisitable,
     visitable: OperativeStatementVisitable,
     high: OperativeStatementVisitable) => void
};

const { makeIntermediateNodeForNode } = OrganizationNodeTypeInfo;

export const OperativeStatementBuilder = freeze({
  makeFromTokens:
    (tokens: Token[],
     representationToOperandRelation: Readonly<{ [rep: string]: string }>) =>
  {
    const data = tokens.map((token: Token, index: number) => {
      const operandRelation = representationToOperandRelation[token.content()];
      const mapperFn = operandRelation ?
        OrganizationNodeTypeInfo.onOperandRelation(operandRelation) :
        OrganizationNodeTypeInfo.forTesting.onFallback();
      return mapperFn(token, index);
    });
    return OperativeStatementBuilder.make(data);
  },
  make: (mData: osb.PrecedenceOrganizationNode[] = []) => freeze({
    pushToken: (token: Token, operandRelation: string) => {
      const creatorFn = OrganizationNodeTypeInfo.onOperandRelation(operandRelation);
      mData.push(creatorFn(token, mData.length));
    },
    pushNode: (node: IastNode) =>
      { mData.push(makeIntermediateNodeForNode(node, mData.length)); },
    completion: memoize(() => OperativeStatementCompletion.make(mData))
  })
});
