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
import { Token } from '../token';
import { ErrorsCollector } from './errors_collector';
import { AstBuild_ } from './ast_build_constructor_retrieval';
import { LetMarkingStack } from './operator_stripping/let_markings_stack';
import {
  StripBuild,
  StripBuildResult
} from './operator_stripping/strip_build';
import {
  AstInitializerExpression,
  AstLiteralType,
  AstNode,
  AstParameterExpression
} from '../ast_node';

const { freeze, memoize } = Helpers;

function visitLiteral(_0: Token, _1: AstLiteralType): StripBuildResult
  { return 'not-modified'; }

function visitFringe(_0: Token): StripBuildResult
  { return 'not-modified'; }

const isUndefined = <T>(t: T | undefined): boolean => t === undefined;

const {
  makeFunctionDefinition,
  makeTuple,
  makeCall,
} = AstNode.forOperatorStripping;

function make(mRawTreeRoot: AstNode): AstBuild_ {
  // TODO name expression build should outmode LetMarkingStack entirely
  const mLetsStack = LetMarkingStack.make();
  const mErrorCollection = ErrorsCollector.make();

  function recurseOnTuple
    (nodes: Readonly<AstNode[]>): AstNode[] | 'not-modified' | undefined
  {
    const gvs = nodes.map(recurseOn);
    if (gvs.some(isUndefined))
      { return undefined; }

    return gvs as AstNode[];
  }

  function recurseOnParameter
    (p: AstParameterExpression): AstParameterExpression | undefined
  {
    const typeNode = recurseOn(p.typeNode);
    if (!typeNode)
      { return typeNode; }

    return freeze({ typeNode, names: p.names });
  }

  function visitFunctionDefinition
    (_0: number,
     parameters: Readonly<AstParameterExpression[]>,
     nodes: Readonly<AstNode[]>): StripBuildResult
  {
    const gv = recurseOnTuple(nodes);
    if (gv === undefined)
      { return gv; }

    const newParameters = parameters.map(recurseOnParameter);
    if (newParameters.some(isUndefined))
      { return undefined; }

    const newNodes = gv === 'not-modified' ? nodes : gv as Readonly<AstNode[]>;
    return makeFunctionDefinition(
      newParameters as Readonly<AstParameterExpression[]>, newNodes);
  }

  function visitTuple(nodes: Readonly<AstNode[]>): StripBuildResult {
    const gv = recurseOnTuple(nodes);
    if (gv === undefined || gv === 'not-modified')
      { return gv; }

    return makeTuple(gv);
  }

  function visitInitializer
    (_0: AstInitializerExpression): StripBuildResult
  { raise('initializers should not exist on the AST yet'); }

  const recurseOn = (node: AstNode): AstNode | undefined => {
    mLetsStack.markOutsideLetStatement();
    const gv = node.visit(mVisitor);
    mLetsStack.popMarking();
    if (gv === 'not-modified')
      { return node; }

    return gv;
  };

  function visitRegularCall
    (callName: Token, receiver: AstNode, args: AstNode): StripBuildResult
  {
    mLetsStack.markOutsideLetStatement();
    const recGv = receiver.visit(mVisitor);
    const argGv = args.visit(mVisitor);
    mLetsStack.popMarking();

    if (recGv === argGv && recGv === 'not-modified')
      { return 'not-modified'; }

    if (recGv === undefined || argGv === undefined)
      { return undefined; }

    if (recGv !== 'not-modified')
      { receiver = recGv; }
    if (argGv !== 'not-modified')
      { args = argGv; }
    return makeCall(callName, receiver, args);
  }

  function visitCall
    (callName: Token, receiver: AstNode, args: AstNode): StripBuildResult
  {
    const ctor = StripBuild.chooseSpecialization(callName, mLetsStack);
    if (!ctor)
      { return visitRegularCall(callName, receiver, args); }

    const { node, error } = ctor(recurseOn, callName, receiver, args);
    if (node() === undefined) {
      mErrorCollection.pushError(error());
      return undefined;
    }
    
    if (node() === 'not-modified') {
      return visitRegularCall(callName, receiver, args);
    }

    return node();
  }

  const mVisitor = freeze({
    visitLiteral,
    visitFringe,
    visitFunctionDefinition,
    visitTuple,
    visitInitializer,
    visitCall
  });

  const node = memoize((): AstNode | undefined => {
    const res = mRawTreeRoot.visit(mVisitor);
    if (res === 'not-modified')
      { return mRawTreeRoot; }

    return res;
  });

  return freeze({
    node,
    errors: mErrorCollection.errors
  });
}

export const OperatorStripping = freeze({ make });
