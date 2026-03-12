import { Helpers, raise } from './helpers';
import { Token } from './token';

const { freeze, memoize } = Helpers;

export interface IastVisitor<ResultType = void> {
  visitString(v: string): ResultType;
  visitInteger(v: string): ResultType;
  visitFringe(v: string): ResultType;
  visitTuple(nodes: Readonly<IastNode[]>): ResultType;
  visitLet(innerNode: IastNode): ResultType;
  visitCall(callName: IastNode, receiver: IastNode, args: IastNode): ResultType;
  visitFunctionDefinition(nodes: Readonly<IastNode[]>): ResultType;
}

export interface ReseatableIastVisitor extends IastVisitor {
  setInstRef(newInst: ReseatableIastVisitor): ReseatableIastVisitor
}

export const IastVisitor = freeze({
  makeDefaultingToContinue(): ReseatableIastVisitor {
    let inst = ({
      visitString(_0: string) {},
      visitInteger(_0: string) {},
      visitFringe(_0: string) {},
      visitTuple(nodes: Readonly<IastNode[]>)
        { nodes.forEach((v: IastNode) => v.visit(inst)); },
      visitLet(innerNode: IastNode)
        { innerNode.visit(inst); },
      visitCall(callName: IastNode, receiver: IastNode, args: IastNode) {
        callName.visit(inst);
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
  }
});

// IAST: Initial Abstract Syntax Tree
export interface IastNode {
  asString: () => string,
  visit<T>(visitor: IastVisitor<T>): T
};

const isATuple = Symbol();
interface IastTuple extends IastNode {
  isATuple: symbol,
  append(n: IastNode): void,
  detuplify(): Readonly<IastNode[]>
}
const IastTuple = freeze({
  tuplify(tOrN1: IastNode, n2: IastNode): IastTuple {
    if ('isATuple' in tOrN1) {
      const temp = tOrN1 as IastTuple;
      temp.append(n2);
      return temp;
    } else {
      return IastTuple.make([tOrN1, n2]);
    }
  },
  detuplify(n: IastNode): Readonly<IastNode[]> {
    if ('isATuple' in n) {
      return (n as IastTuple).detuplify();
    }
    return [n];
  },
  make(mMembers: IastNode[] = []): IastTuple {
    return freeze({
      detuplify: (): Readonly<IastNode[]> => mMembers,
      isATuple,
      append(n: IastNode) {
        mMembers.push(n);
      },
      visit<T>(visitor: IastVisitor<T>) {
        return visitor.visitTuple(mMembers);
      },
      asString: () =>
        `Tuple { ${mMembers.map(v => v.asString()).join(', ')} }`,
    });
  }
});

const IastDefinition = freeze({
  make(nodes: IastNode[]): IastNode {
    return freeze({
      asString: () =>
        `Definition { ${nodes.map(v => v.asString()).join(', ')} }`,
      visit<T>(v: IastVisitor<T>) { return v.visitFunctionDefinition(nodes); }
    });
  }
});

const IastFringe = freeze({
  contextNode: memoize((): IastNode => IastFringe.make( Token.kContextToken )),
  make(token: Token): IastNode {
    const tokenTypes = Token.types;
    const { content } = token;
    const visit = (() => {
      switch (token.type()) {
      case tokenTypes.identifier:
      case tokenTypes.operator:
      case tokenTypes.special:
        return <T>(v: IastVisitor<T>) => v.visitFringe(content());
      case tokenTypes.stringLiteral:
        return <T>(v: IastVisitor<T>) => v.visitString(content());
      case tokenTypes.integerLiteral:
        return <T>(v: IastVisitor<T>) => v.visitInteger(content());
      default:
        raise(`cannot build stringable node from token "${content()}"`);
      }
    })();
    return freeze({ asString: content, visit });
  }
});

const IastLet = freeze({
  make(dnode: IastNode): IastNode {
    return freeze({
      asString: () => `Let { ${dnode.asString()} }`,
      visit<T>(v: IastVisitor<T>) { return v.visitLet(dnode); }
    });
  }
});

const IastCall = freeze({
  make(callName: IastNode, receiver: IastNode, args: IastNode): IastNode {
    return freeze({
      asString: () =>
        `Call { name: ${callName.asString()}, ` +
        `receiver: ${receiver.asString()}, ` +
        `args: ${args.asString()} }`,
      visit<T>(v: IastVisitor<T>) {
        return v.visitCall(callName, receiver, args);
      }
    });
  }
});

export const IastNode = freeze({
  makeEmptyTuple: memoize(IastTuple.make),
  makeFunctionDefinition: IastDefinition.make,
  makeFringe: IastFringe.make,
  forLetDeclarationRetrievals: {
    makeTuple: IastTuple.make,
    detuplify: IastTuple.detuplify
  },
  forOperativeStatements: {
    makeCall(callName: Token, receiver: IastNode, args: IastNode):
      IastNode
    {
      return IastCall.make(IastFringe.make(callName), receiver, args);
    },
    makeOnContextCall(callName: IastNode, args: IastNode): IastNode {
      return IastCall.make(callName, IastFringe.contextNode(), args);
    },
    tuplify: IastTuple.tuplify,
    makeLetDeclation: IastLet.make
  }
});
