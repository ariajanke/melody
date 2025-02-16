import { AstNode } from './ast_node';
import { Helpers } from '../helpers';
import { AstNodeVisitor } from './ast_node_visitor';

const { freeze, memoize } = Helpers;

export interface AstLetDeclarationNode extends AstNode {};

const { hasCreated, type } = AstNode.makeTypeClassMethods();

export const AstLetDeclarationNode = freeze({
  make: (node: AstNode): AstNode => {
    const { executionType } = node;

    const inst = freeze({
      visit: <AccumulationType>(visitor: AstNodeVisitor<AccumulationType>): AccumulationType =>
        visitor.visitLetDeclaration(inst, node),
      type,
      executionType,
      asString: () => `let ${node.asString()}...`,
      uid: memoize(Symbol),
      asName: () => undefined
    });

    return inst;
  },
  type,
  hasCreated
});
