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
import { AstNode, AstVisitor } from '../../ast_node';
import { Token } from '../../token';
import { StripBuild, StripBuildResult } from './strip_build';
import { NameExpressionBuild } from '../name_expression_build';
import { OperatorDefinitions } from '../operator_definitions';
import { OperatorNamingSchema } from '../../operator_naming_schema';

const { freeze, memoize } = Helpers;

const emptyTupleVisitor = memoize((): AstVisitor<boolean | undefined> => freeze({
  ...NameExpressionBuild.visitToUndefined(),
  visitTuple: (nodes: Readonly<AstNode[]>): boolean | undefined =>
    nodes.length === 0
}));

const checkPrecedenceAssumption = memoize((): void => {
  const { kIs, kAssignment, kEquality } = OperatorNamingSchema;
  const { binaryMappings } = OperatorDefinitions;
  const isPrec = binaryMappings()[kIs]?.precedence;
  const eqPrec = binaryMappings()[kEquality]?.precedence;
  const assgnPrec = binaryMappings()[kAssignment]?.precedence;
  if (isPrec === undefined || eqPrec === undefined || assgnPrec === undefined)
    { raise('operators undefined'); }

  if (isPrec > eqPrec || isPrec > assgnPrec) {
    raise('failed assumption: "is" must be weaker binding than "=" or ":="');
  }
});

function make
  (mRecurseOn: (n: AstNode) => AstNode | undefined,
   _1: Token,
   mReceiver: AstNode,
   mArgs: AstNode)
  : StripBuild
{
  checkPrecedenceAssumption();

  if (!mArgs.visit(emptyTupleVisitor()))
    { raise('parameter node must be an empty tuple'); }

  const { error, setErrorMessage, setErrorFn } = StandardError.make();

  function withCall(callName: Token, receiver: AstNode, args: AstNode): AstNode | undefined {
    const grouping = callName.content();
    if (grouping !== ':=' && grouping !== '=') {
      return setErrorMessage('let must be declared with either "=" or ":="');
    }
    const { nameExpression, error } = NameExpressionBuild.make( receiver );
    if (!nameExpression())
      { return setErrorFn(error); }

    const gArgs = mRecurseOn(args);
    if (!gArgs)
      { return undefined; }

    return AstNode.forOperatorStripping.
      makeInitializer(nameExpression()!, grouping, gArgs);
  }

  const visitor = (): AstVisitor<AstNode | undefined> => freeze({
    ...NameExpressionBuild.visitToUndefined(),
    visitCall: withCall
  });

  const node =
    memoize((): StripBuildResult => mReceiver.visit(visitor()));

  return freeze({ node, error });
}

export const LetStripBuild = freeze({ make });
