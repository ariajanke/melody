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
import { AstNode } from '../ast_node';
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import {
  AstBuild_,
  AstBuildConstructorRetrieval
} from './ast_build_constructor_retrieval';

const { freeze, memoize } = Helpers;

const { makeFunctionDefinition } = AstNode.forAstFunctionDefinitionBuild;

function make
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetrieval: AstBuildConstructorRetrieval): AstBuild_
{
  const errors = ErrorsCollector.make();
  const nodes = (() => {
    const nodes: AstNode[] = [];
    const clen = mSegment.children().length;
    for (let cidx = 0; cidx < clen; ++cidx) {
      const child = mSegment.children()[cidx];
      const ibuild = mCtorRetrieval.constructorFor(child.type())(mTokens, child, mCtorRetrieval);
      if (ibuild.node()) {
        nodes.push(ibuild.node()!);
      } else {
        errors.pushErrors(ibuild.errors());
      }
    }
    return nodes;
  });

  const node = memoize(() => {    
    nodes(); // NOTE must build first to accumulate errors
    if (errors.errors().length > 0)
      { return undefined; }

    return makeFunctionDefinition(nodes());
  });  

  return freeze({ node, errors: errors.errors });
}

export const AstFunctionDefinitionBuild = freeze({ make });
