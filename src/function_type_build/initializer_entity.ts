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

import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { CodeEmission, FunctionTypeBuild } from '../function_type_build';
import { Helpers, raise, StandardError } from '../helpers';
import { FunctionTypeBase } from './function_type_base';
import { ContextFrameSnapshot } from './context_frame_stack';
import { AstInitializerNode, AstNode } from '../ast_node';
import { Token } from '../token';
import { ConstantEntity, EmissionContext, MelodyEntity, ObjectType } from '../melody_components';
import { TupleObjectType } from './tuple_object_type';
import { NodeEntitySet } from './context_build/task_controller';

const { freeze, memoize, softMemoize } = Helpers;

const tokenToString = (t: Token) => t.content();

function make
  (mInitializer: AstInitializerNode,
   mContextTypeFn: () => ObjectType,
   mEntityNodeSet: NodeEntitySet)
  : ConstantEntity
{
  const mCallName = FunctionNamingSchema.
    mapToInitialSetName(mInitializer.names.map(tokenToString));

  const emission = softMemoize((): CodeEmission | undefined => {
    const prmEnt =  mEntityNodeSet.
      entityOf(mInitializer.valueNode);
    const prmType = prmEnt.get('object-type');
    const prmEm = prmEnt.get('code-emission');

    if (!prmType || !prmEm)
      { return undefined; }

    const initializerEm =
      mContextTypeFn().
      lookUp(mCallName)?.
      byParameters(prmType)?.
      emission();

    if (!initializerEm)
      { return undefined; }

    return freeze({
      uid: memoize(Symbol),
      type: () => 'code-emission',
      emit(writer: CodeWriter, ctx: EmissionContext): void {
        ctx.pushParameters(prmType, prmEm);
        initializerEm.emit(writer, ctx);
      }
    });
  });

  return MelodyEntity.functionalizedFrom({
    'object-type': TupleObjectType.emptyTuple,
    'code-emission': emission
  });
}

export const InitializerEntity = freeze({ make });
