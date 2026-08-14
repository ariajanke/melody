import {
  DastNode,
  DastFunctionNameMappings
} from '../dast_build';
import { Helpers } from '../helpers';
import { DastNodeBase } from './dast_node';
import { DastVisitor_ } from './dast_visitor';

const { freeze } = Helpers;

export const DastFunctionDefintion = freeze({
  make(mappings: DastFunctionNameMappings,
       nodes: DastNode[])
  {
    const inst = freeze({
      ...DastNodeBase.make(),
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitFunctionDefinition(mappings, nodes)
    });
    return inst;
  }
});

interface DastTupleNode extends DastNode {
  detuplify(): Readonly<DastNode[]>;
};

export const DastTuple = freeze({
  detuplify(node: DastNode): Readonly<DastNode[]> | undefined {
    if ('detuplify' in node) {
      return (node as DastTupleNode).detuplify();
    }
    return undefined;
  },
  make(nodes: DastNode[]): DastTupleNode {
    return freeze({
      ...DastNodeBase.make(),
      detuplify: () => nodes,
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitTuple(nodes)
    });
  }
});

export const DastInitialSet = freeze({
  make(namesDefined: readonly string[] | string, innerNode: DastNode): DastNode {
    return freeze({
      ...DastNodeBase.make(),
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitInitialSet(namesDefined, innerNode),
    });
  }
});

export const DastCall = freeze({
  make(mCallName: string,
       mReceiver: DastNode,
       mArgs: DastNode)
  {
    return freeze({
      ...DastNodeBase.make(),
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitCall(mCallName, mReceiver, mArgs),
    });
  }
});
