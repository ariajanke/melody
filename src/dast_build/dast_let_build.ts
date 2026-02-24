import { DastBuild, DastLetDeclaration } from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { IastNode } from '../iast_node';
import { LetDeclarationsRetrieval } from './let_declarations_retrieval';

const { freeze, memoize } = Helpers;

function make
  (mInnerNode: IastNode,
   mIntoDastBuild: (node: IastNode) => DastBuild,
   mCurrentDeclarations: () => DastLetDeclaration[]): DastBuild
{
  const mRetrieval = LetDeclarationsRetrieval.make(mInnerNode, mIntoDastBuild);

  const { elements, dastNode } = mRetrieval;

  const { error, setErrorFn } = StandardError.make();

  const node = memoize(() => {
    if (!elements() || !dastNode()) {
      setErrorFn(mRetrieval.error);
      return undefined;
    }

    mCurrentDeclarations().push(...elements()!);

    return dastNode()!;
  });

  return freeze({ node, error });
}

export const DastLetBuild = freeze({ make });
