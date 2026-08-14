import { Helpers } from '../helpers';
import type {
  DastFunctionNameMappings,
  DastNode,
  ReseatableDastVisitor
} from '../dast_build';

const { freeze } = Helpers;

export interface DastVisitor_<ResultType = void> {
  visitString(v: string): ResultType;
  visitInteger(v: string): ResultType;
  /// Fringe name strings will exclude there "." preface e.g. "a" instead of
  /// ".a"
  visitFringe(v: string): ResultType;
  visitTuple(nodes: Readonly<DastNode[]>): ResultType;
  /// callNames can be "puts", "a:="
  visitCall(callName: string, receiver: DastNode, args: DastNode): ResultType;
  visitInitialSet(namesDefined: Readonly<string[]> | string, node: DastNode): ResultType;
  visitFunctionDefinition(
    nameMappings: DastFunctionNameMappings,
    nodes: Readonly<DastNode[]>):
    ResultType;
}

function visitFringe(_0: string) {}

function makeDefaultingToContinue(): ReseatableDastVisitor {
  let inst = ({
    visitString: visitFringe,
    visitInteger: visitFringe,
    visitFringe,
    visitCall(callName: string, receiver: DastNode, args: DastNode) {
      receiver.visit(inst);
      args.visit(inst);
    },
    visitTuple(nodes: Readonly<DastNode[]>) {
      nodes.forEach((v: DastNode) => v.visit(inst));
    },
    visitInitialSet(_0: Readonly<string[]> | string, node: DastNode) {
      node.visit(inst);
    },
    visitFunctionDefinition(
      _0: DastFunctionNameMappings,
      nodes: Readonly<DastNode[]>)
    {
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
