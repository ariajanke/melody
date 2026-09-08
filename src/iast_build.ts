import { Helpers, raise } from './helpers';
import { FunctionBodySegmentation } from './iast_build/function_body_segmentation';
import {
  IastBuild_,
  IastBuildConstructor,
  IastBuildConstructorRetrieval 
} from './iast_build/iast_build_constructor_retrieval';
import { IastExpressionBuild } from './iast_build/iast_expression_build';
import { IastFunctionDefinitionBuild } from './iast_build/iast_function_definition_build';
import { SegmentType } from './iast_build/segment';
import { IastNode } from './iast_node';
import { Token } from './token';

const { freeze } = Helpers;

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
  if (!segment()) {
    raise(error().message);
  }
  return IastFunctionDefinitionBuild.
    make(tokens, segment()!, IastBuildConstructorRetrieval.instance());
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
