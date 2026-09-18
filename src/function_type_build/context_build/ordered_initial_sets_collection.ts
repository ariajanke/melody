import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers } from '../../helpers';
import { AstNode } from '../../ast_node';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';

const { freeze, memoize } = Helpers;

export interface InitialSetVariables {
  name: string;
  variableNames: Readonly<string[]>;
  valueNode: AstNode;
};

interface WritableVariableNameFunctions {
  accessorName?: string;
  modifierName?: string;
  tupleRank?: number;
};

export type VariableNameFunctions =
  Readonly<WritableVariableNameFunctions>;

export interface OrderedInitialSetsCollection {
  orderedInitialSets(): Readonly<Readonly<InitialSetVariables>[]>;
  variableNameMap(): Readonly<{ [vname: string]: VariableNameFunctions | undefined }>;
};

function make
  (mDeclarations: Readonly<NameDeclaration[]>): OrderedInitialSetsCollection
{
  const variableNameMap = memoize((): Readonly<{ [vname: string]: VariableNameFunctions | undefined }> => {
    const map: { [vname: string]: VariableNameFunctions | undefined } = {};
    const len = mDeclarations.length;
    for (let idx = 0; idx < len; ++idx) {
      const decl = mDeclarations[idx];
      const declLen = decl.names.length;
      for (let jdx = 0; jdx < declLen; ++jdx) {
        const tupleRank = declLen > 1 ? jdx : undefined;
        const vname = decl.names[jdx];
        const accessorName = FunctionNamingSchema.mapToFringeAccessor(vname);
        const modifierName = decl.type === ':=' ?
          FunctionNamingSchema.mapToAssignment(vname) :
          undefined;
        map[vname] = freeze({
          tupleRank,
          accessorName,
          modifierName
        });
      }
    }
    return map;
  });

  const orderedInitialSets = memoize((): Readonly<Readonly<InitialSetVariables>[]> =>
    mDeclarations.map((decl: NameDeclaration): Readonly<InitialSetVariables> => 
      freeze({
        name: FunctionNamingSchema.mapToInitialSetName(decl.names),
        variableNames: decl.names,
        valueNode: decl.value
      })));

  return freeze({ orderedInitialSets, variableNameMap });
}

export const OrderedInitialSetsCollection = freeze({ make });
