import { DastDeclarationMap, WritableDastDeclarationMap } from '../dast_build';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, StandardError } from '../helpers';
import { DastTuple } from './dast_node_specializations';
import { LetNameElement } from './let_declarations_retrieval';

const { freeze, memoize } = Helpers;

function make(mElement: LetNameElement) {
  const { error, setErrorMessage } = StandardError.make();
  const { value, dependeeNames } = mElement;
  
  const {
    mapToAssignment,
    mapToFringeAccessor,
    mapToInitialSetName,
    kAssignmentOperator,
  } = FunctionNamingSchema;

  const tupleCount = memoize(() => 
    DastTuple.detuplify(mElement.value)?.length);

  const variableNames = memoize(() => {
    if ('name' in mElement) {
      return [mElement.name];
    }
    if (tupleCount() === undefined) {
      // NOTE rhs maybe a single identifier, but may still be a tuple
      //      e.g. let (a, b) = t, where t is a tuple
      //      which we cannot know at DAST time
      return mElement.names;
    }
    if (tupleCount() !== mElement.names.length) {
      return setErrorMessage(`Tuple count (${tupleCount()}) does not match ` +
                              `variable count (${mElement.names.length})`);
    }
    return mElement.names;
  });

  const variableNamesWithRank =
    (fn: (name: string, idx: number | undefined) => void): void =>
  {
    variableNames()?.forEach((name: string, idx: number | undefined) => {
      // a variable name has a rank in only one condition:
      // when the value node is a tuple
      idx = (tupleCount() || 'name' in mElement) ? undefined : idx;
      fn(name, idx);
    });
  };

  type WritableDeclMap = WritableDastDeclarationMap;

  const mDastLetDeclarationMap: WritableDeclMap = {};

  const assignmentNames = memoize((): DastDeclarationMap => {
    if (mElement.operator !== kAssignmentOperator) {
      return mDastLetDeclarationMap;
    }
    // nice overhead jackass
    variableNamesWithRank((name: string, tupleRank: number | undefined) => {
      mDastLetDeclarationMap[mapToAssignment(name)] = {
        value,
        assignment: { tupleRank, variableName: name }
      };
    });
    return mDastLetDeclarationMap;
  });

  const fringeAccessorNames = memoize((): DastDeclarationMap => {
    variableNamesWithRank((name: string, tupleRank: number | undefined) => {
      mDastLetDeclarationMap[mapToFringeAccessor(name)] = {
        value,
        accessor: { tupleRank, variableName: name }
      };
    });
    return mDastLetDeclarationMap;
  });


  const initialSetName = memoize((): DastDeclarationMap => {
    const initSetName =
      variableNames() && mapToInitialSetName(variableNames()!);
    if (initSetName) {
      mDastLetDeclarationMap[initSetName] = {
        value,
        initialSet: {
          variableNames: variableNames()!,
          dependeeNames
        }
      };
    }
    return mDastLetDeclarationMap;
  });

  return freeze({
    fullNames: memoize((): DastDeclarationMap | undefined =>
      variableNames() && assignmentNames() && fringeAccessorNames() &&
      initialSetName()),
    error
  });
}

export const DastLetDeclarationBuild = freeze({ make });
