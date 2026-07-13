import { DastDeclarationMap, DastNode } from '../../dast_build';
import { ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { VariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface DeclarationVariableAllocation {
  variableAllocation(): VariableAllocation;
};

export const DeclarationVariableAllocation = freeze({
  make(mVariableAllocation: VariableAllocation,
       mReturnValueOfNode: (node: DastNode) => ObjectType,
       mDeclarationsMap: DastDeclarationMap
  )
    : DeclarationVariableAllocation
  {
    function upto<T>(i: number, n: number, withT: T, fn: (i: number, t: T) => T) {
      if (n < 0)
        { raise(`Index must be a non-negative integer`); }
      return upto(i + 1, n, fn(i, withT), fn);
    }

    function allocateForNames(varAlloc: VariableAllocation, names: Readonly<string[]>, node: DastNode) {
      const varType = mReturnValueOfNode(node);
      const types = names.length > 1 ? varType.detuplify() : [varType];
      if (!types)
        { raise('multiple names for non tuple'); }
      if (types.length !== names.length) {
        raise('oh no');
      }
      return upto(0, types.length, varAlloc, (idx: number, varAlloc: VariableAllocation) => {
        return varAlloc.next(names[idx], types[idx]);
      });
    }
    const variableAllocation = memoize(() =>
      Object.
        keys(mDeclarationsMap).
        reduce((prev: VariableAllocation, name: string) => {
          const decl = mDeclarationsMap[name];
          if (!decl.initialSet)
            { return prev; }
          return allocateForNames(prev, decl.initialSet.variableNames, decl.value);
        }, mVariableAllocation));
    return freeze({ variableAllocation });
  }
});
