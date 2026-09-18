import { Helpers } from '../src/helpers';
import { AstLiteralType, AstNode, AstVisitor, AstInitializerType } from '../src/ast_node';
import { Token } from '../src/token';

const { freeze } = Helpers;

export interface ReseatableAstVisitor extends AstVisitor {
  setInstRef(newInst: ReseatableAstVisitor): ReseatableAstVisitor
}

export const ReseatableAstVisitor = freeze({
  makeDefaultingToContinue(): ReseatableAstVisitor {
    let inst = ({
      visitLiteral(_0: Token, _1: AstLiteralType) {},
      visitFringe(_0: Token) {},
      visitTuple(nodes: Readonly<AstNode[]>)
        { nodes.forEach((v: AstNode) => v.visit(inst)); },
      visitInitializer(
        _0: Readonly<Token[]>,
        _1: AstInitializerType,
        value: AstNode)
      { value.visit(inst); },
      visitCall(_0: Token, receiver: AstNode, args: AstNode) {
        receiver.visit(inst);
        args.visit(inst);
      },
      visitFunctionDefinition(_0: number, nodes: Readonly<AstNode[]>) {
        nodes.forEach((v: AstNode) => v.visit(inst));
      },
      setInstRef(newInst: ReseatableAstVisitor): ReseatableAstVisitor {
        inst = newInst;
        return newInst;
      }
    });
    return inst;
  },
  makeSelfModified(visitor: ReseatableAstVisitor): ReseatableAstVisitor {
    return visitor.setInstRef(visitor);
  }
});
