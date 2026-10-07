/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers } from '../../helpers';
import { AstInitializerNode, AstNode } from '../../ast_node';
import { Token } from '../../token';

const { freeze, memoize } = Helpers;

export interface InitializerVariable {
  readonly name: string;
  readonly variableNames: Readonly<string[]>;
  readonly valueNode: AstNode;
  readonly typeNode?: AstNode;
};

export interface VariableNameFunctions {
  readonly accessorName?: string;
  readonly modifierName?: string;
  readonly tupleRank?: number;
};

export interface OrderedInitialSetsCollection {
  orderedInitialSets(): Readonly<Readonly<InitializerVariable>[]>;
  variableNameMap(): Readonly<{ [vname: string]: VariableNameFunctions | undefined }>;
};

const tokenToString = (t: Token) => t.content();

function make
  (mDeclarations: Readonly<AstInitializerNode[]>): OrderedInitialSetsCollection
{
  const variableNameMap = memoize((): Readonly<{ [vname: string]: VariableNameFunctions | undefined }> => {
    const map: { [vname: string]: VariableNameFunctions | undefined } = {};
    const len = mDeclarations.length;
    for (let idx = 0; idx < len; ++idx) {
      const decl = mDeclarations[idx];
      const declLen = decl.names.length;
      for (let jdx = 0; jdx < declLen; ++jdx) {
        const tupleRank = declLen > 1 ? jdx : undefined;
        const vname = tokenToString(decl.names[jdx]);
        const accessorName = FunctionNamingSchema.mapToFringeAccessor(vname);
        const modifierName = decl.qualifier === ':=' ?
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

  const orderedInitialSets = memoize((): Readonly<Readonly<InitializerVariable>[]> =>
    mDeclarations.map((decl: AstInitializerNode): Readonly<InitializerVariable> => {
      const names = decl.names.map(tokenToString);
      return freeze({
        name: FunctionNamingSchema.mapToInitialSetName(names),
        variableNames: names,
        valueNode: decl.valueNode,
        typeNode: decl.typeNode
      });
    }));

  return freeze({ orderedInitialSets, variableNameMap });
}

export const OrderedInitialSetsCollection = freeze({ make });
