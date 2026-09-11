import { Helpers, raise } from './helpers';
import { FunctionBodySegmentation } from './iast_build/function_body_segmentation';
import {
  IastBuild_,
  IastBuildConstructor,
  IastBuildConstructorRetrieval 
} from './iast_build/iast_build_constructor_retrieval';
import { IastExpressionBuild } from './iast_build/iast_expression_build';
import { IastFunctionDefinitionBuild } from './iast_build/iast_function_definition_build';
import { IastOperatorStripping } from './iast_build/iast_operator_stripping';
import { SegmentType } from './iast_build/segment';
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

function make(tokens: Readonly<Token[]>): IastBuild {
  const { isEndOfInput } = FunctionBodySegmentation;

  const { segment, error } = FunctionBodySegmentation.
    make(tokens, 0, tokens.length, isEndOfInput);

  const build = memoize(() => {
    if (!segment())
      { return undefined; }

    return IastFunctionDefinitionBuild.
      make(tokens, segment()!, IastBuildConstructorRetrieval.instance());
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
