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

import { Helpers, StandardError, StandardErrorMessage } from '../../helpers';
import { AstNode } from '../../ast_node';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';

export interface AstBuildSingleError {
  node(): AstNode | undefined;
  error(): StandardErrorMessage;
};

const { freeze, memoize } = Helpers;

const { emptyTupleInstance } = AstNode.forAstExpressionBuild;

function make
  (mConstructors: NodeConstructor[], mOperators: OperatorConstructor[])
  : AstBuildSingleError
{
  const { error, setErrorMessage } = StandardError.make();

  const sortedOperators = memoize(() => 
    mOperators.sort((a: OperatorConstructor, b: OperatorConstructor) => -a.compare(b)));

  const collection = memoize(() =>
    NodeConstructorCollection.make(mConstructors));

  const node = memoize(() => {
    if (mConstructors.length === 0)
      { return emptyTupleInstance(); }

    const sortedLen = sortedOperators().length;
    if (sortedLen === 0) {
      if (mConstructors.length === 1)
        { return mConstructors[0].makeNode(collection()); }

      return setErrorMessage(`expression ends too soon around ""`);
    }

    for (let i = 0; i < sortedLen - 1; ++i) {
      sortedOperators()[i].makeNode(collection());
    }

    const weakestBindingOperator = sortedOperators()[sortedLen - 1];
    const node_ = weakestBindingOperator.makeNode(collection());
    const missedCtor = collection().firstUnreplaced();
    if (missedCtor !== undefined) {
      const token = missedCtor.asToken();
      return setErrorMessage(`expression ends too soon around "${token?.content() ?? '<UNKNOWN>'}"`);
    }

    return node_;
  });

  return freeze({ node, error });
}

export const AstOperationBuild = freeze({ make });
