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
import { AstNode } from '../../ast_node';
import { Token } from '../../token';
import { AstBuildSingleError, AstOperationBuild } from './ast_operation_build';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';
import { OperatorRelation } from '../operator_definitions';
import { OperatorDefinitionBuild } from './operator_definition_build';

export interface AstExpressionCollector {
  /// Tuples pushed here are not flattened!
  pushNode(node: AstNode, asString: () => string): void;
  pushOperator(op: Token): void;
  finish(): AstBuildSingleError;
};

const { freeze, memoize } = Helpers;

const asNoNode = (): AstNode | undefined => undefined;
const isOriginal = () => true;

function make(): AstExpressionCollector {
  const { makeNodeMakerFor } = OperatorConstructor;
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mConstructors: NodeConstructor[] = [];
  const mOperators: OperatorConstructor[] = [];
  let mFinished = false;
  let mLastPushedWasOperator = false;

  function verifyUnfinished() {
    if (!mFinished)
      { return; }

    raise('cannot add to collector after it is finished');
  }
  
  const isInUnaryContext = () =>
    mConstructors.length === 0 ||
    mLastPushedWasOperator;

  const operatorRelation = (): OperatorRelation =>
    isInUnaryContext() ? 'unary' : 'binary';

  return freeze({
    pushNode(node: AstNode, asString: () => string): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      mLastPushedWasOperator = false;
      const len = mConstructors.length;
      const position = () => len;

      mConstructors.push(freeze({
        fitsContainer(cont: Readonly<{ length: number }>): boolean
          { return cont.length > len; },
        isOriginal,
        asString,
        makeNode: makeNodeMakerFor(node),
        lowPosition: position,
        highPosition: position
      }));
    },
    pushOperator(op: Token): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      const { operatorDefinition, error } = OperatorDefinitionBuild.
        make(op, operatorRelation());

      if (!operatorDefinition())
        { return setErrorFn(error); }

      mLastPushedWasOperator = true;
      const opCtor = OperatorConstructor.
        make(operatorDefinition()!, op, mConstructors.length);
      mConstructors.push(opCtor);
      mOperators.push(opCtor);
    },
    finish: memoize((): AstBuildSingleError => {
      mFinished = true;
      if (hasErrorSet())
        { return freeze({ node: asNoNode, error }); }

      return AstOperationBuild.make(mConstructors, mOperators);
    })
  });
}

export const AstExpressionCollector = freeze({ make });
