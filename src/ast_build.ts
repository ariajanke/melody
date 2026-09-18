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
