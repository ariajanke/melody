import { Helpers, raise } from './helpers';
import {
  IastBuild_,
  IastBuildConstructor,
  IastBuildConstructorRetrieval 
} from './iast_build/iast_build_constructor_retrieval';
import { IastExpressionBuild } from './iast_build/iast_expression_build';
import { IastFunctionDefinitionBuild } from './iast_build/iast_function_definition_build';
import { IastOperatorStripping } from './iast_build/iast_operator_stripping';
import { Segmentation, SegmentType } from './iast_build/segmentation';
import { IastNode } from './iast_node';
import { Token } from './token';

const { freeze, memoize } = Helpers;

export type IastBuild = IastBuild_;

IastBuildConstructorRetrieval.initialize(((): IastBuildConstructorRetrieval => {
  const strats: Readonly<{ [st in SegmentType]: IastBuildConstructor | undefined }> = freeze({
    functionDefinitionBody: IastFunctionDefinitionBuild.make,
    expression: IastExpressionBuild.make
  });

  return freeze({
    constructorFor(type: SegmentType): IastBuildConstructor {
      return strats[type] ?? raise('not a valid type');
    }
  });
})());

function make(mTokens: Readonly<Token[]>): IastBuild {  
  const { segment, error } = Segmentation.makeInitialSegmentation(mTokens);

  const build = memoize(() => {
    if (!segment())
      { return undefined; }

    return IastFunctionDefinitionBuild.
      make(mTokens, segment()!, IastBuildConstructorRetrieval.instance());
  });

  const assignmentStripping = memoize((): IastBuild | undefined => {
    const node_ = build()?.node();
    if (!node_)
      { return undefined; }

    return IastOperatorStripping.make(node_);
  });

  const node = ((): IastNode | undefined =>
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

function buildFor(tokens: Readonly<Token[]>): IastNode {
  const inst = IastBuild.make(tokens);
  const res = inst.node();
  if (!res) {
    raise(`Failed to build AST:\n${inst.errors()[0]?.message}`);
  }
  return res;
}

export const IastBuild = freeze({
  make,
  buildFor
});
