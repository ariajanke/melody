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

import { Helpers, raise, StandardError, StandardErrorMessage } from '../../helpers';
import { AstInitializerType, AstNode, AstVisitor } from '../../ast_node';
import { AstLiteralType } from '../../ast_node';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { OperatorDefinitions } from '../operator_definitions';

const { freeze, memoize } = Helpers;

export interface ReceiverNameStripping {
  nameTarget(): Token | undefined;
  strippedTree(): AstNode | undefined;
  error(): StandardErrorMessage;
};

function assumeDotIsTightest() {
  const { fullListing } = OperatorDefinitions;
  const tightestBindingOperator = fullListing()[fullListing().length - 1];
  if (tightestBindingOperator.representation === OperatorNamingSchema.kDot)
    { return; }

  raise('The dot operator was assumed to be the tightest binding operator, but it is not');
}

function make(mRoot: AstNode): ReceiverNameStripping {
  type Direction = 'not-right' | 'right';
  type Res = AstNode | 'not-modified' | undefined;
  let mNameTarget: Token | undefined = undefined;
  let mDirection: Direction = 'right';
  const { setErrorMessage, error } = StandardError.make();  
  const {
    makeTuple,
    makeCall,
    makeInitializer,
    tokenize,
    makeContextNodeAt,
  } = AstNode.forOperatorStripping;

  assumeDotIsTightest();

  function furtherVisit(node: AstNode, dir: Direction): Res {
    const originalDirection = mDirection;
    if (originalDirection === 'right') {
      mDirection = dir;
    }
    const rv = node.visit(mVisitor);
    mDirection = originalDirection;
    return rv;
  }

  function visitLiteral(_0: Token, _1: AstLiteralType): Res {
    if (mDirection === 'right') {
      return setErrorMessage('cannot use literal as a target of an assignment');
    }

    return 'not-modified';
  };

  function visitFringe(token: Token): Res {
    if (mDirection === 'right') {
      mNameTarget = token;
      return makeContextNodeAt(token);
    }

    return 'not-modified';
  }

  // FEATURE-TODO
  // invert the call with the tuple
  // the tuple acts as a series of assigments based on the rhs
  // not supportable
  function visitTuple(nodes: Readonly<AstNode[]>): Res {
    if (nodes.length === 1 && mDirection === 'right') {
      const rv = furtherVisit(nodes[0], mDirection);
      if (rv === 'not-modified' || rv === undefined)
        { return rv; }

      return makeTuple([rv]);
    }

    if (mDirection === 'right') {
      return setErrorMessage('cannot use assignment on a multi-member tuple');
    }

    return 'not-modified';
  }

  function visitCall
    (callName: Token, receiver: AstNode, parameters: AstNode): Res
  {
    const token = tokenize(parameters);
    if (token &&
        callName.content() === OperatorNamingSchema.kDot &&
        mDirection === 'right')
    {
      mNameTarget = token;
      return receiver;
    }

    const recRv = furtherVisit(receiver, 'not-right');
    if (recRv === undefined)
      { return recRv; }

    if (recRv !== 'not-modified')
      { raise('non-right branch modified!'); }

    const rv = furtherVisit(parameters, 'right');
    if (rv === undefined || rv === 'not-modified')
      { return rv; }

    return makeCall(callName, receiver, rv);
  }

  function visitInitializer
    (names: Readonly<Token[]>,
     group: AstInitializerType,
     value: AstNode): Res
  {
    const rv = furtherVisit(value, mDirection);
    if (rv === undefined || rv === 'not-modified')
      { return rv; }

    return makeInitializer(names, group, rv);
  }

  function visitFunctionDefinition(_0: number, nodes: Readonly<AstNode[]>): Res {
    if (mDirection === 'right') {
      return setErrorMessage('a function definition cannot be a target of an assignment');
    }

    nodes.forEach((n: AstNode) => {
      const rv = furtherVisit(n, 'not-right');
      if (rv === undefined || rv === 'not-modified')
        { return; }

      raise('non-right branch modified!');
    });

    return 'not-modified';
  }

  const mVisitor: AstVisitor<Res> = freeze({
    visitLiteral,
    visitFringe,
    visitTuple,
    visitCall,
    visitInitializer,
    visitFunctionDefinition
  });

  const strippedTree = memoize((): AstNode | undefined => {
    const res = mRoot.visit(mVisitor);
    if (res === 'not-modified')
      { return mRoot; }

    return res;
  });

  const nameTarget = memoize((): Token | undefined => {
    if (!strippedTree())
      { return undefined; }

    return mNameTarget;
  });

  return freeze({
    nameTarget,
    strippedTree,
    error
  });
}

export const ReceiverNameStripping = freeze({ make });
