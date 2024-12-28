import { type FunctionLookUpTable } from './function_look_up_table';
import { Helpers } from './helpers';
import { ObjectType, WritableObjectType } from './object_type';
import { VariableDeclarationFunctionTable } from './variable_declaration_function_table';

const { freeze, memoize } = Helpers;

export interface VariableDeclaration extends ObjectType {
  mergeInto(obj: WritableObjectType): WritableObjectType
};

export const VariableDeclaration = freeze({
  make(name: string, varType: ObjectType, operator: string, offset: number = 0): VariableDeclaration {
    const lookUpTable = memoize(() => VariableDeclarationFunctionTable.
      make(varType, operator, offset));

    const inst = freeze({
      name: () => `<context>.Let(${varType.name()})`,
      lookUp(operation: string): FunctionLookUpTable | undefined {
        if (operation === name) {
          return lookUpTable();
        }
        return undefined;
      },
      forEachName(fn: (name: string, table: FunctionLookUpTable) => void) {
        fn(name, lookUpTable());
      },
      uid: memoize(Symbol),
      decompose: memoize((): ObjectType[] => [inst]),
      mergeInto(obj: WritableObjectType) {
        // I need to know by how much to adjust my offset
        return obj.acceptMerge((currentOffset: number) => {
          return VariableDeclaration.
            make(`.${name}`, varType, operator, currentOffset);
        });
      },
      sizeInWords: () => 1, // size of integer by definition

    });
    return inst;
  }
});
