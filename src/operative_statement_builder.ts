import { Token } from './token';
import { Helpers } from './helpers';
import { PrecedenceOrganizationNode } from './operative_statement_builder/precedence_organization_node';
import { AstNode } from './ast_node';
import { OrganizationNodeTypeInfo } from './operative_statement_builder/organization_node_type_info';
import { OperativeStatementCompletion } from './operative_statement_completion';

const { freeze, memoize } = Helpers;

export interface OperativeStatementVisitable {
  visit: (visitor: OperativeStatementVisitor) => void,
  uniqueIdentifier: () => symbol,
};

export interface OperativeStatementVisitor {
  visitToken   : (token: Token) => void,
  visitNode    : (node: AstNode) => void,
  visitLinks:
    (low: OperativeStatementVisitable,
     visitable: OperativeStatementVisitable, //visitorFn: (visitor: OperativeStatementVisitor) => void,
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
  make: (mData: PrecedenceOrganizationNode[] = []) => freeze({
    pushToken: (token: Token, operandRelation: string) => {
      const creatorFn = OrganizationNodeTypeInfo.onOperandRelation(operandRelation);
      mData.push(creatorFn(token, mData.length));
    },
    pushNode: (node: AstNode) =>
      { mData.push(makeIntermediateNodeForNode(node, mData.length)); },
    completion: memoize(() => OperativeStatementCompletion.make(mData))
  })
});
