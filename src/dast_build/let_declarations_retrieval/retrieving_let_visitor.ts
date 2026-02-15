import { Helpers } from '../../helpers';
import { IastNode, IastVisitor } from '../../iast_node';
import { Token } from '../../token';
import { LetNamesCollector } from './let_names_collector';
import { NamingExpressionVisitor } from './naming_expression_visitor';

const { freeze } = Helpers;

const DependeeNameRetrieval = (() => {
  function make(): IastVisitor<Readonly<string[]>> {
    const temp: string[] = [];
    const rtTemp = (_0: string | number) => temp;
    const visitEach = (n: IastNode) => n.visit(inst);
    const recursiveVisit = (nodes: Readonly<IastNode[]>) => {
      nodes.forEach(visitEach);
      return temp;
    };
    const inst = freeze({
      visitString: rtTemp,
      visitInteger: rtTemp,
      visitFringe(v: string) {
        temp.push(v);
        return temp;
      },
      visitTuple: recursiveVisit,
      visitLet(_0: IastNode): Readonly<string[]> {
        throw new Error('no nested lets allowed');
      },
      visitCall(callName: IastNode, receiver: IastNode, args: IastNode) {
        if (receiver.asString() === Token.kContextToken.content()) {
          callName.visit(inst);
        } else {
          receiver.visit(inst);
        }
        args.visit(inst);
        return temp;
      },
      visitFunctionDefinition: recursiveVisit
    });
    return inst;
  }

  return freeze({ make });
})();

export const RetrievingLetVisitor = (() => {
  const makeLiteralNameError = (_0: string | number) =>
    LetNamesCollector.makeErroneous('cannot use literal as a name');
  const visitFringe = (_0: string) =>
    LetNamesCollector.makeErroneous('missing operator "=" or ":="');
  const visitTuple = (_0: Readonly<IastNode[]>) =>
    LetNamesCollector.makeErroneous('not supported');
  const visitLet = (_0: IastNode) =>
    LetNamesCollector.makeErroneous('no nested lets allowed');
  const visitFunctionDefinition = (_0: Readonly<IastNode[]>) =>
    LetNamesCollector.makeErroneous('fn def doesn\'t make sense here');
  function make(): IastVisitor<LetNamesCollector> {
    const inst = freeze({
      visitString: makeLiteralNameError,
      visitInteger: makeLiteralNameError,
      visitFringe,
      visitTuple,
      visitLet,
      visitCall(callName: IastNode, receiver: IastNode, args: IastNode) {
        // receiver('s name) is being named by fArgs
        const visitor = NamingExpressionVisitor.make();
        const res = receiver.visit(visitor);
        if (!res.names()) {
          throw new Error(res.error().message);
        }
        const names = [...res.names() as Readonly<string[]>];
        const dependeeNames = args.visit(DependeeNameRetrieval.make());
        return LetNamesCollector.
          make(names, callName.asString(), dependeeNames, args);
      },
      visitFunctionDefinition
    });
    return inst;
  }

  return freeze({ make });
})();
