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
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { NodeConstructorCollection } from './node_constructor_collection';
import { NodeConstructor, OperatorConstructor } from './operator_constructor';

const { freeze } = Helpers;

const {
  mergeTuple,
  mergeTupleLeft,
  mergeTupleRight,
  makeCall,
  makeTuple
} = AstNode.forAstExpressionBuild;

function combineTuples
  (rec: NodeConstructor, prms: NodeConstructor, ctors: NodeConstructorCollection): AstNode
{
  const recNode = rec.makeNode(ctors);
  const prmsNode = prms.makeNode(ctors);
  if (!rec.isOriginal() && !prms.isOriginal()) {
    return mergeTuple(recNode, prmsNode);
  } else if (!rec.isOriginal()) {
    return mergeTupleLeft(recNode, prmsNode);
  } else if (!prms.isOriginal()) {
    return mergeTupleRight(recNode, prmsNode);
  }

  return makeTuple([recNode, prmsNode]);
}

const makeOtherCtor = (callName: Token) =>
  (rec: NodeConstructor, prms: NodeConstructor, ctors: NodeConstructorCollection): AstNode => {
    const recNode = rec.makeNode(ctors);
    const prmsNode = prms.makeNode(ctors);

    return makeCall(callName, recNode, prmsNode);
  };

function make(mOpToken: Token, mPosition: number) {
  const { isNotOriginal, makeNodeMakerFor } = OperatorConstructor;

  const mCtor = mOpToken.content() === OperatorNamingSchema.kComma ?
    combineTuples :
    makeOtherCtor(mOpToken);

  const fitsContainer = (container: Readonly<{ length: number }>): boolean =>
    mPosition > 0 && (mPosition + 1) < container.length;

  const makeNode = (ctors: NodeConstructorCollection): AstNode => {
    const recCtor = ctors.at(mPosition - 1);
    const paramsCtor = ctors.at(mPosition + 1);
    const node = mCtor(recCtor, paramsCtor, ctors);
    const opc: NodeConstructor = freeze({
      fitsContainer: paramsCtor.fitsContainer,
      isOriginal: isNotOriginal,
      asString: paramsCtor.asString,
      makeNode: makeNodeMakerFor(node),
      lowPosition: recCtor.lowPosition,
      highPosition: paramsCtor.highPosition
    });
    ctors.replace(opc);
    return node;
  };

  return freeze({ fitsContainer, makeNode });
}

export const BinaryOperatorConstructor = freeze({ make });
