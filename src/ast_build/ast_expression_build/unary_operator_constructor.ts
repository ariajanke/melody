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
import { Helpers } from '../../helpers';
import { Token } from '../../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';

const { freeze } = Helpers;

const { makeCall, emptyTupleInstance } = AstNode.forAstExpressionBuild;

function make(mOpToken: Token, mPosition: number) {
  const { isNotOriginal, makeNodeMakerFor } = OperatorConstructor;

  const mCtor = (rec: AstNode) =>
    makeCall(mOpToken, rec, emptyTupleInstance());

  const fitsContainer = (container: Readonly<{ length: number }>): boolean =>
    mPosition >= 0 && (mPosition + 1) < container.length;

  const makeNode = (ctors: NodeConstructorCollection): AstNode => {
    const recCtor = ctors.at(mPosition + 1);
    const rec = recCtor.makeNode(ctors);
    const node = mCtor(rec);
    const opc: NodeConstructor = freeze({
      fitsContainer,
      isOriginal: isNotOriginal,
      asString: recCtor.asString,
      makeNode: makeNodeMakerFor(node),
      lowPosition: () => mPosition,
      highPosition: recCtor.highPosition,
    });
    ctors.replace(opc);
    return node;
  };

  return freeze({ makeNode, fitsContainer });
}

export const UnaryOperatorConstructor = freeze({ make });
