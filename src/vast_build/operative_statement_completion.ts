import { StandardError, Helpers } from '../helpers';
import {
  PrecedenceOrganizationNode,
  type OperativeStatementVisitable
} from './operative_statement_builder';
import { Token } from '../token';
import { AstNode } from './ast_node';

const { freeze, memoize } = Helpers;

export const OperativeStatementCompletion = (() => {
  const make =
    (mNodes: PrecedenceOrganizationNode[]) =>
  {
    const { error, setErrorMessage, hasErrorSet } = StandardError.make();
    const { isNullVisitable } = PrecedenceOrganizationNode;
    const mCounts: { [uid: symbol]: number } = {};
    const isValidVisitable = (vst: OperativeStatementVisitable) => {
      if (!isNullVisitable(vst)) {
        return mCounts[vst.uniqueIdentifier()] === 1;
      }
      return true;
    };
    const markVisitable = (vst: OperativeStatementVisitable) => {
      const id = vst.uniqueIdentifier();
      mCounts[id] = (mCounts[id] ?? 0) + 1;
    };
    const verifyAllVisited = (): void => {
      // can't reduce on a different type, my language will be different
      // ffs microsoft
      mNodes.forEach((pon: PrecedenceOrganizationNode) => {
        if (!isValidVisitable(pon)) {
          setErrorMessage(`Expression malformed around "${pon.asString()}"`);
          // and I can't short circut using forEach (I'm trying to avoid fors)
        }
      });
    };
    const mInternalVisitor = freeze({
      visitToken   : (_0: Token) => {},
      visitNode    : (_0 : AstNode) => {},
      visitLinks:
        (low : OperativeStatementVisitable,
         node: OperativeStatementVisitable,
         high: OperativeStatementVisitable) =>
      {
        markVisitable(node);
        if (hasErrorSet())
          { return; }
        low .visit(mInternalVisitor);
        high.visit(mInternalVisitor);
      }
    });

    const inst = freeze({
      rootVisitable: memoize((): OperativeStatementVisitable | undefined => {
        if (inst.isEmpty())
          { return undefined; }
        const pon = PrecedenceOrganizationNode.workCollection(mNodes);
        if (!pon) {
          setErrorMessage('working operative statement collection failed');
          return undefined;
        }
        pon.visit(mInternalVisitor);
        if (hasErrorSet())
          { return undefined; }
        verifyAllVisited();
        if (hasErrorSet())
          { return undefined; }
        return pon;
      }),
      isEmpty: () => mNodes.length === 0,
      error
    });
    return inst;
  };
  return freeze({ make });
})();
