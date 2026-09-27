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

import { FunctionType, FunctionTypeBuild, ObjectType } from '../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { CodeWriter } from '../code_writer';
import { WritableContextFrameStack } from './context_frame_stack';
import { FunctionDefinitionRegistry } from '../function_definition_registry';
import { DefinitionBodyFunctionBuild } from './definition_body_function_build';
import { FunctionIndexType } from './function_index_type';
import { TupleObjectType } from './tuple_object_type';
import { AstInitializerType, AstLiteralType, AstNameExpression, AstNode, AstVisitor } from '../ast_node';
import { Token } from '../token';
import { IntegerType } from './integer_type';

const { freeze, memoize } = Helpers;

export interface ObjectTypeBuild {
  objectType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

type WritablePairs = [string, ObjectType][];

export type NameObjectTypePairs = Readonly<WritablePairs>;

export interface ParametersTypeRetrieval {
  asType(): ObjectType | undefined;
  namesToIndividualTypes(): NameObjectTypePairs | undefined;
  error(): StandardErrorMessage;
};

const grabType = (pair: [string, ObjectType]): ObjectType => pair[1];

function defaultNodeEvaluation(node: AstNode): ObjectTypeBuild {
  // we accept identifiers: "Integer", "Tuple"
  // we accept tuples within calls by name of "Tuple"
  // this will be eventually be replaced with "immediates"
  const { setErrorFn, setErrorMessage, error } = StandardError.make();
  function visitLiteral(_0: Token, _1: AstLiteralType): ObjectType | undefined {
    return setErrorMessage('Cannot use a literal inside a type expression');
  }
  function visitFringe(token: Token): ObjectType | undefined {
    const name = token.content();
    if (name === 'Integer') {
      return IntegerType.instance();
    }
    
    return setErrorMessage(`Unrecognized type name "${name}"`);
  }

  function visitTuple(nodes: Readonly<AstNode[]>): ObjectType | undefined {

  }
  function visitInitializer(
    nameExpression: AstNameExpression,
    group: AstInitializerType,
    value: AstNode): ObjectType | undefined
  {
    ;
  }
  function visitCall(callName: Token, receiver: AstNode, args: AstNode): ObjectType | undefined {

  }
  function visitFunctionDefinition(
    uid: number,
    parameters: Readonly<AstNameExpression[]>,
    nodes: Readonly<AstNode[]>): ObjectType | undefined
  {

  }

  const mVisitor: AstVisitor<ObjectType | undefined> = freeze({
    visitLiteral,
    visitFringe,
    visitTuple,
    visitInitializer,
    visitCall,
    visitFunctionDefinition
  });
}

function make(mParameters: Readonly<AstNameExpression[]>,
              mEvaluateNodeIntoType: (node: AstNode) => ObjectTypeBuild)
  : ParametersTypeRetrieval
{
  const { setErrorFn, setErrorMessage, error } = StandardError.make();

  function nameExpressionInto
    (pairs: WritablePairs | undefined, nameExpr: AstNameExpression): WritablePairs | undefined
  {
    if (!pairs)
      { return pairs; }

    const oTypeBuild = mEvaluateNodeIntoType(nameExpr.type);
    const fullType = oTypeBuild.objectType();
    if (!fullType)
      { return setErrorFn(oTypeBuild.error); }

    const namesLength = nameExpr.names.length;

    if (namesLength === 0)
      { raise('invalid name expression there must be at least one name'); }

    if (namesLength === 1) {
      pairs.push([nameExpr.names[0].content(), fullType]);
      return pairs;
    }

    const subTypes = fullType.detuplify();
    if (!subTypes) {
      return setErrorMessage('cannot break up non tuple type');
    }
    if (subTypes.length !== namesLength) {
      return setErrorMessage('tuple length does not match number of names');
    }
    for (let i = 0; i < namesLength; ++i) {
      pairs.push([ nameExpr.names[i].content(), subTypes[0] ]);
    }
    return pairs;
  }

  const namesToIndividualTypes = memoize((): NameObjectTypePairs | undefined =>
    mParameters.reduce(nameExpressionInto, []));

  const asType = memoize((): ObjectType | undefined => {
    if (!namesToIndividualTypes())
      { return undefined; }

    return TupleObjectType.instanceFor(namesToIndividualTypes()!.map(grabType));
  });

  return freeze({
    namesToIndividualTypes,
    asType,
    error
  });
}

export const ParametersTypeRetrieval = freeze({ make });
