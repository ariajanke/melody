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

import { ObjectType } from '../function_type_build';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { TupleObjectType } from './tuple_object_type';
import {
  AstInitializerExpression,
  AstLiteralType,
  AstNode,
  AstParameterExpression,
  AstVisitor
} from '../ast_node';
import { Token } from '../token';
import { IntegerType } from './integer_type';

const { freeze, memoize } = Helpers;

// TODO remove service once immediate evaluables are available
export interface NodeTypeEvaluation {
  objectType(): ObjectType | undefined;
  error(): StandardErrorMessage;
};

type ResultType = ObjectType | Readonly<ObjectType[]> | undefined;

const isNotSingleObject = (res: ResultType) =>
  res === undefined || ('length' in res)

function make(mNode: AstNode): NodeTypeEvaluation {
  // we accept identifiers: "Integer", "Tuple"
  // we accept tuples within calls by name of "Tuple"
  // this will be eventually be replaced with "immediates"
  
  const { setErrorMessage, error } = StandardError.make();

  function visitLiteral(_0: Token, _1: AstLiteralType): ResultType {
    return setErrorMessage('Cannot use a literal inside a type expression');
  }

  function visitFringe(token: Token): ResultType {
    const name = token.content();
    if (name === 'Integer') {
      return IntegerType.instance();
    }
    
    return setErrorMessage(`Unrecognized type name "${name}"`);
  }

  function visitTuple(nodes: Readonly<AstNode[]>): ResultType {
    if (nodes.length === 0)
      { return undefined; }

    const results = nodes.map((node: AstNode) => node.visit(mVisitor));
    const firstNonMatch = results.findIndex(isNotSingleObject);
    if (firstNonMatch === -1)
      { return results as Readonly<ObjectType[]>; }

    if (results[firstNonMatch] === undefined)
      { return undefined; }

    return setErrorMessage('cannot mix tuples');
  }

  function visitInitializer(_0: AstInitializerExpression): ResultType {
    raise('initializer within a name expression?!');
  }

  function visitCall(callName: Token, receiver: AstNode, args: AstNode): ResultType {
    // HACK check receiver is "<context>" only
    //      eventually this entire service will be replaced with
    //      immediate evaluable values
    if (receiver.asString() !== '<context>') {
      return setErrorMessage('cannot accept non-context calls');
    }

    if (callName.content() !== 'Tuple') {
      return setErrorMessage('cannot support anything other than "Tuple"');
    }

    const gv = args.visit(mVisitor);
    if (gv === undefined)
      { return gv; }

    if ('length' in gv)
      { return TupleObjectType.instanceFor(gv as Readonly<ObjectType[]>); }    

    // NOTE single tuples are their own single value by definition
    return gv;
  }

  function visitFunctionDefinition(
    _0: number,
    _1: Readonly<AstParameterExpression[]>,
    _2: Readonly<AstNode[]>): ResultType
  {
    return setErrorMessage('a function definition cannot be used as a type');
  }

  const mVisitor: AstVisitor<ResultType> = freeze({
    visitLiteral,
    visitFringe,
    visitTuple,
    visitInitializer,
    visitCall,
    visitFunctionDefinition
  });

  return freeze({
    objectType: memoize((): ObjectType | undefined => {
      const res = mNode.visit(mVisitor);
      if (!res)
        { return res; }

      if ('length' in res)
        { return setErrorMessage('cannot use multiple types for a parameter'); }

      return res as ObjectType;
    }),
    error
  });
}

export const NodeTypeEvaluation = freeze({ make });
