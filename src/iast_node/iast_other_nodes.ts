import { Helpers } from '../helpers';
import { Token } from '../token';
import { IastNode_, IastVisitor_ } from './iast_types';

const { freeze } = Helpers;

export const IastDefinition = freeze({
  make(nodes: IastNode_[]): IastNode_ {
    return freeze({
      asString: () =>
        `Definition { ${nodes.map(v => v.asString()).join(', ')} }`,
      visit: <T>(v: IastVisitor_<T>) =>
        v.visitFunctionDefinition(nodes)
    });
  }
});

export const IastLet = freeze({
  make(dnode: IastNode_): IastNode_ {
    return freeze({
      asString: () => `Let { ${dnode.asString()} }`,
      visit: <T>(v: IastVisitor_<T>) => v.visitLet(dnode)
    });
  }
});

export const IastCall = freeze({
  make(callName: Token, receiver: IastNode_, args: IastNode_): IastNode_ {
    return freeze({
      asString: () =>
        `Call { name: ${callName.content()}, ` +
        `receiver: ${receiver.asString()}, ` +
        `args: ${args.asString()} }`,
      visit: <T>(v: IastVisitor_<T>) =>
        v.visitCall(callName, receiver, args)
    });
  }
});
