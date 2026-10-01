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

import { Helpers } from '../helpers';
import { Segment } from './segmentation';
import { AstNode, AstParameterExpression } from '../ast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import {
  AstBuild_,
  AstBuildConstructorRetrieval
} from './ast_build_constructor_retrieval';
import { NameExpressionBuild } from './name_expression_build';

const { freeze, memoize } = Helpers;

const { makeFunctionDefinition } = AstNode.forAstFunctionDefinitionBuild;

function make
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: AstBuildConstructorRetrieval): AstBuild_
{
  const mErrors = ErrorsCollector.make();
  const mParameters: AstParameterExpression[] = [];
  const mChildrenCount = mSegment.children().length;

  function forHead(node: AstNode) {
    const { nameExpression, error } = NameExpressionBuild.make(node, 'no-value');
    if (nameExpression()) {
      const { names, typeNode } = nameExpression()!;
      if (typeNode) {
        console.log(`parameters for ${names.map(t => t.content()).join(', ')}`);
        mParameters.push({ names, typeNode });
      } else {
        mErrors.pushError({ message: 'parameter is missing a type' });
      }
    } else {
      mErrors.pushError(error());
    }
  }

  const nodes = memoize((): Readonly<AstNode[]> => {
    const mNodes: AstNode[] = [];
    for (let cidx = 0; cidx < mChildrenCount; ++cidx) {
      const child = mSegment.children()[cidx];
      const ctor = mCtorRetrieval.constructorFor(child.type());
      const ibuild = ctor(mTokens, child, mCtorRetrieval);
      if (!ibuild.node()) {
        mErrors.pushErrors(ibuild.errors());
        continue;
      }

      if (child.type() === 'functionDefinitionHead') {
        const asMany = AstNode.forAstFunctionDefinitionBuild.
          detuplify(ibuild.node()!);
        if (asMany) {
          asMany.forEach(forHead);
        } else {
          forHead(ibuild.node()!);
        }
      } else {
        mNodes.push(ibuild.node()!);
      }
    }

    return mNodes;
  });

  const node = memoize(() => {    
    nodes(); // NOTE must build first to accumulate errors
    if (mErrors.errors().length > 0)
      { return undefined; }

    return makeFunctionDefinition(mParameters, nodes());
  });  

  return freeze({ node, errors: mErrors.errors });
}

export const AstFunctionDefinitionBuild = freeze({ make });
