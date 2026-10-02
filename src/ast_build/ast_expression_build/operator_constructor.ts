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

import { AstNode } from '../../ast_node';
import { InitializableClass, raise } from '../../helpers';
import { Token } from '../../token';
import { OperatorDefinition } from '../operator_definitions';
import { type NodeConstructorCollection } from './node_constructor_collection';

export interface OperatorPrecedence {
  readonly precedence: number;
  readonly position: number;
};

export interface NodeConstructor {
  makeNode(ctors: NodeConstructorCollection): AstNode;
  /// true if this was an originally pushed node/token for the collector
  isOriginal(): boolean;
  fitsContainer(cont: Readonly<{ length: number }>): boolean;
  asString(): string;
  lowPosition(): number;
  highPosition(): number;
};

export interface OperatorConstructor extends NodeConstructor {
  operatorPrecedence(): OperatorPrecedence;
  compare(other: OperatorConstructor): number;
};

export const OperatorConstructor = InitializableClass.
  on({
    make(_0: OperatorDefinition, _1: Token, _2: number): OperatorConstructor
      { raise('must initialize class'); }
  }).
  withLocked({
    isNotOriginal: () => false,
    makeNodeMakerFor(node: AstNode) {
      return (_0: NodeConstructorCollection): AstNode => node;
    }
  });
