import { Helpers } from '../helpers';
import type {
  DastLetDeclations,
  DastNode,
  ReseatableDastVisitor
} from '../dast_build';

const { freeze } = Helpers;

export interface DastVisitor_<ResultType = void> {
  visitString(v: string): ResultType;
  visitInteger(v: string): ResultType;
  visitFringe(v: string): ResultType;
  visitTuple(nodes: Readonly<DastNode[]>): ResultType;
  visitCall(callName: DastNode, receiver: DastNode, args: DastNode): ResultType;
  visitInitialSet(namesDefined: readonly string[] | string, node: DastNode): ResultType;
  visitFunctionDefinition(orderedDefs: DastLetDeclations, nodes: Readonly<DastNode[]>):
    ResultType;
}

function visitFringe(_0: string) {}

function makeDefaultingToContinue(): ReseatableDastVisitor {
  let inst = ({
    visitString: visitFringe,
    visitInteger: visitFringe,
    visitFringe,
    visitCall(callName: DastNode, receiver: DastNode, args: DastNode) {
      callName.visit(inst);
      receiver.visit(inst);
      args.visit(inst);
    },
    visitTuple(nodes: Readonly<DastNode[]>) {
      nodes.forEach((v: DastNode) => v.visit(inst));
    },
    visitInitialSet(_0: readonly string[] | string, node: DastNode) {
      node.visit(inst);
    },
    visitFunctionDefinition(_0: DastLetDeclations, nodes: Readonly<DastNode[]>) {
      nodes.forEach((v: DastNode) => v.visit(inst));
    },
    setInstRef(newInst: ReseatableDastVisitor): ReseatableDastVisitor {
      inst = newInst;
      return newInst;
    }
  });
  return inst;
}

export const DastVisitor_ = freeze({ makeDefaultingToContinue });
