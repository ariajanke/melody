import { Helpers } from '../src/helpers';
import { IastLiteralType, IastNode, IastVisitor } from '../src/iast_node';
import { Token } from '../src/token';

const { freeze } = Helpers;

export interface ReseatableIastVisitor extends IastVisitor {
  setInstRef(newInst: ReseatableIastVisitor): ReseatableIastVisitor
}

export const ReseatableIastVisitor = freeze({
  makeDefaultingToContinue(): ReseatableIastVisitor {
    let inst = ({
      visitLiteral(_0: Token, _1: IastLiteralType) {},
      visitFringe(_0: Token) {},
      visitTuple(nodes: Readonly<IastNode[]>)
        { nodes.forEach((v: IastNode) => v.visit(inst)); },
      visitLet(innerNode: IastNode)
        { innerNode.visit(inst); },
      visitCall(_0: Token, receiver: IastNode, args: IastNode) {
        receiver.visit(inst);
        args.visit(inst);
      },
      visitFunctionDefinition(nodes: Readonly<IastNode[]>) {
        nodes.forEach((v: IastNode) => v.visit(inst));
      },
      setInstRef(newInst: ReseatableIastVisitor): ReseatableIastVisitor {
        inst = newInst;
        return newInst;
      }
    });
    return inst;
  },
  makeSelfModified(visitor: ReseatableIastVisitor): ReseatableIastVisitor {
    return visitor.setInstRef(visitor);
  }
});
