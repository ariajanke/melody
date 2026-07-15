import { FunctionTypeBuild, ObjectType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';

const { freeze, memoize } = Helpers

export type NameTypePair = { name: string; type: ObjectType; };

export interface DeclarationFunctionGroup {
  baseValueFunctionBuild(): FunctionTypeBuild;
  functionNames(): Readonly<string[]>;
  variableBreakdown(): Readonly<NameTypePair[]>;
};

export const DeclarationFunctionGroup = freeze({
  make(mFunctionTypeBuild: FunctionTypeBuild,
       mFunctionNames: Readonly<string[]>,
       mVariableNames: Readonly<string[]>
  ): DeclarationFunctionGroup
  {
    const baseValueFunctionBuild = () => mFunctionTypeBuild;
    const functionNames = () => mFunctionNames;
    // NOTE this should not be this fbuild's initial evaluation of
    //      "functionType"
    const type = () => mFunctionTypeBuild.functionType()?.returns() ??
      raise('fbuild is suppose to be error checked first');
    const types = memoize(() => {
      const t = type();
      return t.detuplify() ?? [t];
    });

    const variableBreakdown = memoize(() => {
      return mVariableNames.map((name: string, idx: number) => {
        const type = types()[idx] ?? raise('malformed DAST?');
        return { name, type };
      });
    });

    return freeze({
      functionNames, variableBreakdown, baseValueFunctionBuild
    });
  }
});
