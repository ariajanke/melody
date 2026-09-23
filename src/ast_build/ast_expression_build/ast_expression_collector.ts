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
import { type NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';
import { OperatorConstructorBuild } from './operator_constructor_build';

const { freeze, memoize } = Helpers;

export interface AstExpressionCollector {
  pushNode(node: AstNode): void;
  pushOperator(op: Token): void;
  finish(): AstBuildSingleError;
};

const asNoToken = (): Token | undefined => undefined;
const asNoNode = (): AstNode | undefined => undefined;
const isNotOperator = (): boolean => false;

function make(): AstExpressionCollector {
  const { error, setErrorFn, hasErrorSet } = StandardError.make();
  const mConstructors: NodeConstructor[] = [];
  const mOperators: OperatorConstructor[] = [];
  let mFinished = false;

  function verifyUnfinished() {
    if (!mFinished)
      { return; }

    raise('cannot add to collector after it is finished');
  }
  
  function isInUnaryContext() {
    return mConstructors.length === 0 ||
           mConstructors[mConstructors.length - 1].isOperator();
  }

  return freeze({
    pushNode(node: AstNode): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      const len = mConstructors.length;
      const position = () => len;

      mConstructors.push(freeze({
        isOperator: isNotOperator,
        asToken: asNoToken,
        makeNode(_0: NodeConstructorCollection): AstNode
          { return node; },
        lowPosition: position,
        highPosition: position
      }));
    },
    pushOperator(op: Token): void {
      verifyUnfinished();
      if (hasErrorSet())
        { return; }

      const { operatorConstructor, error } = OperatorConstructorBuild.
        make(op, isInUnaryContext(), mConstructors.length);

      if (!operatorConstructor())
        { return setErrorFn(error); }

      const opCtor = operatorConstructor()!;
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
