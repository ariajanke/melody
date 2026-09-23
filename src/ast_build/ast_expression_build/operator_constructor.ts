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
import { Token } from '../../token';
import { type NodeConstructorCollection } from './node_constructor_collection';

export interface NodeConstructor {
  makeNode(ctors: NodeConstructorCollection): AstNode;
  isOperator(): boolean;
  asToken(): Token | undefined;
  lowPosition(): number;
  highPosition(): number;
};

export interface OperatorConstructor extends NodeConstructor {
  compare(other: OperatorConstructor): number;
};
