import { DastBuild, DastDeclarationMap, WritableDastDeclarationMap } from '../dast_build';
import { Helpers, StandardError } from '../helpers';
import { IastNode } from '../iast_node';
import { DastLetDeclarationBuild } from './dast_let_declaration_build';
import { LetDeclarationsRetrieval, LetNameElement } from './let_declarations_retrieval';

const { freeze, memoize } = Helpers;

function make
  (mInnerNode: IastNode,
   mIntoDastBuild: (node: IastNode) => DastBuild,
   mCurrentDeclarations: () => WritableDastDeclarationMap): DastBuild
{
  const mRetrieval = LetDeclarationsRetrieval.make(mInnerNode, mIntoDastBuild);

  const { elements, dastNode } = mRetrieval;

  const { error, setErrorFn, setErrorMessage } = StandardError.make();

  const declarationBuilds = memoize(() => {
    if (!elements())
      { return undefined; }

    const rv = elements()?.map((element: LetNameElement) => {
      const { fullNames, error } = DastLetDeclarationBuild.make(element);
      return fullNames() ?? setErrorFn(error);
    });
    if (rv?.some((declarationMap) => !declarationMap))
      { return undefined; }

    return rv as DastDeclarationMap[];
  });

  const node = memoize(() => {
    if (!elements() || !dastNode()) {
      setErrorFn(mRetrieval.error);
      return undefined;
    } else if (!declarationBuilds()) {
      return undefined;
    }

    for (const declarationMap of declarationBuilds()!) {
      for (const name in declarationMap) {
        if (mCurrentDeclarations()[name]) {
          return setErrorMessage(`Duplicate declaration of "${name}"`);
        }
        // TODO BAD
        mCurrentDeclarations()[name] = declarationMap[name];
      }
    }
    return dastNode()!;
  });

  return freeze({ node, error });
}

export const DastLetBuild = freeze({ make });
