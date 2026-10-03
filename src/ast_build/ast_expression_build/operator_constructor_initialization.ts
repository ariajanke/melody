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

import { Helpers } from '../../helpers';
import { AstNode } from '../../ast_node';
import { Token } from '../../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { OperatorConstructor, OperatorPrecedence } from './operator_constructor';
import { OperatorDefinition, OperatorDefinitions, OperatorRelation } from '../operator_definitions';
import { BinaryOperatorConstructor } from './binary_operator_constructor';
import { UnaryOperatorConstructor } from './unary_operator_constructor';

const { freeze, memoize } = Helpers;

const isOriginal = () => true;

type BaseNodeConstructor = {
  makeNode(ctors: NodeConstructorCollection): AstNode;
  fitsContainer(cont: Readonly<{ length: number }>): boolean;
};

type BaseNodeCtorCtor = (t: Token, p: number) => BaseNodeConstructor;

const kNodeStuff: Readonly<{ [op in OperatorRelation]: BaseNodeCtorCtor }> = freeze({
  binary: BinaryOperatorConstructor.make,
  unary: UnaryOperatorConstructor.make
});

function make
  (mOperatorDefinition: OperatorDefinition, mOpToken: Token, mPosition: number): OperatorConstructor {
  OperatorDefinitions.assertIsOperator(mOpToken.content());
  const { fitsContainer, makeNode } =
    kNodeStuff[mOperatorDefinition.relation](mOpToken, mPosition);
  const position = () => mPosition;

  const compare = (other: OperatorConstructor): number => {
    const { precedence, position } = operatorPrecedence();
    const otherInfo = other.operatorPrecedence();
    const diff = precedence - otherInfo.precedence;
    if (diff === 0)
      { return position - otherInfo.position; }

    return diff;    
  };

  const operatorPrecedence = memoize((): OperatorPrecedence => {
    const { isPositionReversed, precedence } = mOperatorDefinition;
    const position = mPosition*( isPositionReversed ? -1 : 1 );

    return freeze({ precedence, position });
  });


  return freeze({
    fitsContainer,
    operatorPrecedence,
    isOriginal,
    compare,
    makeNode,
    asString: mOpToken.content,
    lowPosition: position,
    highPosition: position
  });
}

OperatorConstructor.initializeThisClass({ make });
