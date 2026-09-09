import { Helpers } from '../helpers';
import { IastNode } from '../iast_node';
import { Token } from '../token';
import { type NodeConstructorCollection } from './node_constructor_collection';

// const { freeze } = Helpers;

export interface NodeConstructor {
  makeNode(ctors: NodeConstructorCollection): IastNode;
  isOperator(): boolean;
  asToken(): Token | undefined;
  lowPosition(): number;
  highPosition(): number;
};

export interface OperatorConstructor extends NodeConstructor {
  compare(other: OperatorConstructor): number;
};

// const isNotOperator = () => false;
// const asNoToken = (): Token | undefined => undefined;

// function fromNode(node: IastNode): NodeConstructor {
//   return freeze({
//     isOperator: isNotOperator,
//     asToken: asNoToken,
//     makeNode(_0: NodeConstructorCollection): IastNode
//       { return node; }
//   });
// }

// export const OperatorConstructor = freeze({ fromNode });
