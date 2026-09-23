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

import { Helpers, raise } from './helpers';
import {
  AstBuild_,
  AstBuildConstructor,
  AstBuildConstructorRetrieval 
} from './ast_build/ast_build_constructor_retrieval';
import { AstExpressionBuild } from './ast_build/ast_expression_build';
import { AstFunctionDefinitionBuild } from './ast_build/ast_function_definition_build';
import { OperatorStripping } from './ast_build/operator_stripping';
import { Segmentation, SegmentType } from './ast_build/segmentation';
import { AstNode } from './ast_node';
import { Token } from './token';

const { freeze, memoize } = Helpers;

export type AstBuild = AstBuild_;

AstBuildConstructorRetrieval.initialize(((): AstBuildConstructorRetrieval => {
  const strats: Readonly<{ [st in SegmentType]: AstBuildConstructor | undefined }> = freeze({
    functionDefinitionBody: AstFunctionDefinitionBuild.make,
    expression: AstExpressionBuild.make
  });

  return freeze({
    constructorFor(type: SegmentType): AstBuildConstructor {
      return strats[type] ?? raise('not a valid type');
    }
  });
})());

function make(mTokens: Readonly<Token[]>): AstBuild {  
  const { segment, error } = Segmentation.makeInitialSegmentation(mTokens);

  const build = memoize(() => {
    if (!segment())
      { return undefined; }

    return AstFunctionDefinitionBuild.
      make(mTokens, segment()!, AstBuildConstructorRetrieval.instance());
  });

  const assignmentStripping = memoize((): AstBuild | undefined => {
    const node_ = build()?.node();
    if (!node_)
      { return undefined; }

    return OperatorStripping.make(node_);
  });

  const node = ((): AstNode | undefined =>
    assignmentStripping()?.node());

  return freeze({
    node,
    errors: memoize(() => {
      if (!build()) {
        return [error()];
      }

      if (!assignmentStripping()) {
        return build()!.errors();
      }

      return assignmentStripping()!.errors();
    })
  });  
}

export const AstBuild = freeze({ make });
