import { PrecedenceOrganizationNode } from './operative_statement_builder/precedence_organization_node';
import { StandardError, Helpers } from './helpers';
import {
  type OperativeStatementVisitable,
  type OperativeStatementVisitor
} from './operative_statement_builder';
import { Token } from './token';
import { AstNode } from './ast_node';

const { freeze, memoize } = Helpers;

export const OperativeStatementCompletion = (() => {
  const make =
    (mNodes: PrecedenceOrganizationNode[]) =>
  {
    const { error, setErrorMessage } = StandardError.make();
    const { isNullVisitable } = PrecedenceOrganizationNode;
    const mCounts: { [uid: symbol]: number } = {};
    const isValidVisitable = (vst: OperativeStatementVisitable) => {
      if (!isNullVisitable(vst)) {
        const id = vst.uniqueIdentifier();
        mCounts[id] = (mCounts[id] ?? 0) + 1;
        return mCounts[id] === 1;
      }
      return true;
    };
    const checkSide = (vst: OperativeStatementVisitable,
                       visitorFn: (visitor: OperativeStatementVisitor) => void) =>
    {
      if (!isValidVisitable(vst)) {
        visitorFn(mInternalVisitor);
        mErrorSet = true;
        return setErrorMessage(`Something messed up around ${mSetString}`);
      }
    };
    let mSetString = '';
    let mErrorSet = false
    const mInternalVisitor = freeze({
      visitToken   : (token: Token) =>
        { mSetString = token.content(); },
      visitNode    : (node: AstNode) =>
        { mSetString = node.asString(); },
      visitLinks:
        (low: OperativeStatementVisitable,
         visitorFn: (visitor: OperativeStatementVisitor) => void,
         high: OperativeStatementVisitable) =>
      {
        if (mErrorSet)
          { return; }
        checkSide(low , visitorFn);
        checkSide(high, visitorFn);
      }
    });

    const inst = freeze({
      rootVisitable: memoize((): OperativeStatementVisitable | undefined => {
        if (inst.isEmpty())
          { return undefined; }
        const pon = PrecedenceOrganizationNode.workCollection(mNodes);
        if (!pon)
          { return undefined; }
        pon.visit(mInternalVisitor);
        if (mErrorSet)
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
