import { Helpers } from '../helpers';
import { IastNode } from '../iast_node';

const { freeze } = Helpers;

export interface NodeConstructor {
  makeNode(ctors: NodeConstructor[]): IastNode;
  isOperator(): boolean;
};

export interface OperatorConstructor extends NodeConstructor {
  compare(other: OperatorConstructor): number;
};

export const OperatorConstructor = freeze({
  fromNode(node: IastNode): NodeConstructor {
    return freeze({
      isOperator: () => false,
      makeNode(_0: NodeConstructor[]): IastNode {
        return node;
      }
    });
  }
});
