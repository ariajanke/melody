import { DastLetDeclations, DastNode } from '../dast_build';
import { Helpers } from '../helpers';
import { DastNodeBase } from './dast_node';
import { DastVisitor_ } from './dast_visitor';

const { freeze } = Helpers;

export const DastFunctionDefintion = freeze({
  make(defs: DastLetDeclations, nodes: DastNode[]) {
    function check(): true {
      defs.forEach(def => {
        if (def.value.uid() === inst.uid()) {
          throw new Error('A function definition cannot contain itself as a definition value');
        }
      });
      return true;
    }
    const inst = freeze({
      ...DastNodeBase.make(),
      visit: <T>(visitor: DastVisitor_<T>): T =>
        // check() && 
        visitor.visitFunctionDefinition(defs, nodes)
    });
    // idk how the heck the following could happen
    check();
    return inst;
  }
});

export const DastTuple = freeze({
  make(nodes: DastNode[]) {
    return freeze({
      ...DastNodeBase.make(),
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
  make(mCall: DastNode,
       mReceiver: DastNode,
       mArgs: DastNode)
  {
    return freeze({
      ...DastNodeBase.make(),
      visit: <T>(visitor: DastVisitor_<T>): T =>
        visitor.visitCall(mCall, mReceiver, mArgs),
    });
  }
});
