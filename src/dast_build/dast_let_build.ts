import { DastBuild, DastLetDeclarationMap } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, StandardError } from '../helpers';
import { IastNode } from '../iast_node';
import { LetDeclarationsRetrieval, LetNameElement } from './let_declarations_retrieval';

const { freeze, memoize } = Helpers;

// we'll have to name that old build to LetNameElementBuild
const DastLetDeclarationBuild = freeze({
  make(mElement: LetNameElement) {
    const { value, dependeeNames } = mElement;
    
    const {
      mapToAssignment,
      mapToFringeAccessor,
      mapToInitialSetName,
      kAssignmentOperator,
    } = FunctionNamingSchema;

    const common = memoize(() => freeze({
      dependeeNames,
      value,
      intoVariableNames:
        (('name' in mElement) ?
          [mElement.name] : mElement.names)
    }));

    const mDastLetDeclarationMap: DastLetDeclarationMap = {};

    const intoVariableNames = () => common().intoVariableNames;

    const assignmentNames = memoize((): DastLetDeclarationMap => {
      if (mElement.operator !== kAssignmentOperator) {
        return mDastLetDeclarationMap;
      }
      // nice overhead jackass
      intoVariableNames().forEach((name: string) => {
        mDastLetDeclarationMap[mapToAssignment(name)] =
          { ...common(), operator: ':=' };
      });
      return mDastLetDeclarationMap;
    });

    const fringeAccessorNames = memoize((): DastLetDeclarationMap => {
      intoVariableNames().
      forEach((name: string) => {
        mDastLetDeclarationMap[mapToFringeAccessor(name)] =
          ({ ...common(), operator: '=' });
      });
      return mDastLetDeclarationMap;
    });


    const initialSetName = memoize((): DastLetDeclarationMap => {
      mDastLetDeclarationMap[mapToInitialSetName(intoVariableNames())] =
        { ...common(), operator: 'initialSet' };
      return mDastLetDeclarationMap;
    });

    return freeze({
      fullNames: memoize((): DastLetDeclarationMap =>
        assignmentNames() && fringeAccessorNames() && initialSetName())
    });
  }
});

function make
  (mInnerNode: IastNode,
   mIntoDastBuild: (node: IastNode) => DastBuild,
   mCurrentDeclarations: () => DastLetDeclarationMap): DastBuild
{
  const mRetrieval = LetDeclarationsRetrieval.make(mInnerNode, mIntoDastBuild);

  const { elements, dastNode } = mRetrieval;

  const { error, setErrorFn, setErrorMessage } = StandardError.make();

  const declarationBuilds = memoize(() => {
    if (!elements())
      { return []; }
    return elements()?.map(element => DastLetDeclarationBuild.make(element).fullNames()) ?? [];
  });

  const node = memoize(() => {
    if (!elements() || !dastNode()) {
      setErrorFn(mRetrieval.error);
      return undefined;
    }

    // I'm going to have to throw "order" away :(
    elements()!.map((element: LetNameElement) => {
      return DastLetDeclarationBuild.make(element).fullNames();
    });
    for (const declarationMap of  declarationBuilds()) {
      for (const name in declarationMap) {
        if (mCurrentDeclarations()[name]) {
          return setErrorMessage(`Duplicate declaration of "${name}"`);
        }
        mCurrentDeclarations()[name] = declarationMap[name];
      }
    }
    return dastNode()!;
  });

  return freeze({ node, error });
}

export const DastLetBuild = freeze({ make });
