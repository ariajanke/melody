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

import { Helpers, raise, StandardError } from '../../helpers';
import {
  AstInitializerExpression,
  AstLiteralType,
  AstNode,
  AstParameterExpression,
  AstVisitor
} from '../../ast_node';
import { Token } from '../../token';
import { StripBuild, StripBuildResult } from './strip_build';
import { NameExpressionBuild } from '../name_expression_build';

const { freeze, memoize } = Helpers;

const visitToUndefined = memoize((): AstVisitor<undefined> => freeze({
  visitLiteral: (_0: Token, _1: AstLiteralType): undefined =>
    undefined,
  visitFringe: (_0: Token): undefined => undefined,
  visitTuple: (_0: Readonly<AstNode[]>): undefined => undefined,
  visitInitializer: (_0: AstInitializerExpression): undefined =>
    undefined,
  visitCall: (_0: Token, _1: AstNode, _2: AstNode): undefined =>
    undefined,
  visitFunctionDefinition:
    (_0: number, _1: Readonly<AstParameterExpression[]>,_2: Readonly<AstNode[]>): undefined =>
    undefined
}));

const emptyTupleVisitor = memoize((): AstVisitor<boolean | undefined> => freeze({
  ...visitToUndefined(),
  visitTuple: (nodes: Readonly<AstNode[]>): boolean | undefined =>
    nodes.length === 0
}));

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   _1: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  if (!mArgs.visit(emptyTupleVisitor()))
    { raise('parameter node must be an empty tuple'); }

  const { error, setErrorMessage, setErrorFn } = StandardError.make();

  function withCall(callName: Token, receiver: AstNode, args: AstNode): AstNode | undefined {
    const grouping = callName.content();
    if (grouping !== ':=' && grouping !== '=') {
      return setErrorMessage('let must be declared with either "=" or ":="');
    }
    const { nameExpression, error } = NameExpressionBuild.make( receiver, 'allow-value' );
    if (!nameExpression())
      { return setErrorFn(error); }

    const gArgs = mRecurseOn(args);
    if (!gArgs)
      { return undefined; }

    return AstNode.forOperatorStripping.
      makeInitializer({
        ...nameExpression()!,
        qualifier: grouping,
        valueNode: gArgs
      });
  }

  const visitor = (): AstVisitor<AstNode | undefined> => freeze({
    ...visitToUndefined(),
    visitCall: withCall
  });

  const node =
    memoize((): StripBuildResult => mReceiver.visit(visitor()));

  return freeze({ node, error });
}

export const LetStripBuild = freeze({ make });
