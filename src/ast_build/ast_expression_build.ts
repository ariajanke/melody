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

import { Helpers, raise } from '../helpers';
import { AstNode } from '../ast_node';
import { Token } from '../token';
import { AstExpressionCollector } from './ast_expression_build/ast_expression_collector';
import { ErrorsCollector } from './errors_collector';
import {
  AstBuild_,
  AstBuildConstructorRetrieval
} from './ast_build_constructor_retrieval';
import { Segment } from './segmentation';

const { freeze, memoize } = Helpers;

function make
  (mTokens: Readonly<Token[]>,
   mSegment: Segment,
   mCtorRetreival: AstBuildConstructorRetrieval)
  : AstBuild_
{
  if (mSegment.type() !== 'expression')
    { raise('segment must be an expression'); }
  if (!Segment.hasValidIndices(mSegment))
    { raise('segment must be valid'); }

  const mErrors = ErrorsCollector.make();
  const collector = () => {
    const collector_ = AstExpressionCollector.make();
    let cidx = 0;
    for (let idx = mSegment.start(); idx < mSegment.end(); ) {
      if (mTokens[idx] === undefined)
        { raise('went too far?!'); }
      const child = mSegment.children()[cidx];
      if (idx === child?.start()) {
        const ibuild = mCtorRetreival.constructorFor(child.type())(mTokens, child, mCtorRetreival);
        const node = ibuild.node();
        if (node) {
          collector_.pushNode(node);
        } else {
          mErrors.pushErrors(ibuild.errors());
        }

        idx = child.end();
        ++cidx;
      } else {
        const token = mTokens[idx];
        if (token.type() === Token.types.operator) {
          collector_.pushOperator(token);
        } else if (Segment.isFringe(token)) {
          const node = AstNode.forAstExpressionBuild.makeFringe(token);
          collector_.pushNode(node);
        }
        // NOTE tolerate and ignore any groupings
        ++idx;
      }
    }
    return collector_;
  };

  const node = memoize(() => {
    
    if (mErrors.errors().length > 0)
      { return undefined; }

    const ibuild = collector().finish();
    if (!ibuild.node()) {
      mErrors.pushError(ibuild.error());
      return undefined;
    }

    return ibuild.node();
  });

  return freeze({
    node,
    errors: mErrors.errors
  });
}

export const AstExpressionBuild = freeze({ make });
