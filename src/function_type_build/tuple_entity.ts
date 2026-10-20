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
import { AstNode, AstTupleNode } from '../ast_node';
import { CodeWriter } from '../code_writer';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { CodeEmission, ConstantEntity, EmissionContext, ImmediateValue, MelodyEntity, ObjectType, RuntimeOnlyValue } from '../melody_components';
import { NodeEntitySet } from './context_build/task_controller';
import { EntityBuild } from './fringe_entity';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

const entityToEmission = (ent: ConstantEntity) =>
  ent.get('code-emission');

const entityToImmediate = (ent: ConstantEntity) =>
  ent.get('immediate-value');

const entityToObjectType = (ent: ConstantEntity) =>
  ent.get('object-type');

const entityToRuntimeOnly = (ent: ConstantEntity) =>
  ent.get('runtime-only-value');

const isUndefined = <T>(obj: T | undefined) => obj === undefined;

function asAllDefinedOrNone
  <T>(arr: Readonly<(T | undefined)[]>)
  : Readonly<T[]> | undefined 
{
  return arr.some(isUndefined) ? undefined : arr as Readonly<T[]>;
}

function make
  (mNode: AstTupleNode,
   mEntityNodeSet: NodeEntitySet)
  : ConstantEntity
{
  const childEntities = memoize((): Readonly<ConstantEntity[]> =>
    mNode.nodes.map(mEntityNodeSet.entityOf))

  const reversedChildEntities = memoize((): Readonly<ConstantEntity[]> =>
    childEntities().slice().reverse());

  const mChildCount = mNode.nodes.length;

  const emission = memoize((): CodeEmission | undefined => {
    const reversedEmissions =
      reversedChildEntities().map(entityToEmission);
    if (reversedEmissions.some(isUndefined))
      { raise('shoot'); }

    return freeze({
      uid: memoize(Symbol),
      type: () => 'code-emission',
      emit(writer: CodeWriter, ctx: EmissionContext): void {
        for (let i = 0; i != mChildCount; ++i) {
          reversedEmissions[i]?.emit(writer, ctx);
        }
      }
    })
  });

  const immediateValue = memoize((): ImmediateValue | undefined => {
    const immVals = childEntities().map(entityToImmediate);
    if (immVals.some(isUndefined))
      { return undefined; }

    // TODO allow tuple immediates...
    return undefined;
  });

  const objectType = memoize((): ObjectType | undefined => {
    const objTypes = asAllDefinedOrNone(childEntities().map(entityToObjectType));
    if (!objTypes)
      { return objTypes; }

    return TupleObjectType.instanceFor(objTypes);
  });

  const runtimeOnlyValue = memoize((): RuntimeOnlyValue | undefined => {
    if (childEntities().some(entityToRuntimeOnly))
      { return RuntimeOnlyValue.instance(); }

    return undefined;
  });

  return MelodyEntity.functionalizedFrom({
    'code-emission': emission,
    'immediate-value': immediateValue,
    'object-type': objectType,
    'runtime-only-value': runtimeOnlyValue
  });
}

export const TupleEntityBuild = freeze({ make });
