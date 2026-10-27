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

import { AstDefinitionNode } from '../ast_node';
import { Helpers, raise } from '../helpers';
import { ConstantEntity, EntityFunctionSet, MelodyComponent, MelodyEntity, ObjectType, ReceiverResolutionN } from '../melody_components';

const { freeze } = Helpers;
const kDefaultContextObjFn = (): ObjectType => raise(`don't call me`);
const kDefaultRecResFn = (): ReceiverResolutionN => raise(`don't call me`);

export interface DefinitionEntityFactory {
  associate
    (n: AstDefinitionNode,
     context: () => ObjectType,
     recres: () => ReceiverResolutionN): DefinitionEntityFactory;
  entityOf(node: AstDefinitionNode): ConstantEntity;
};

function make(): DefinitionEntityFactory {
  const mDefToEntity: { [defNodeUid: number]: EntityFunctionSet | undefined } = {};
  function getEntityFunctionSet(defNode: AstDefinitionNode): EntityFunctionSet {
    return mDefToEntity[defNode.uid()] ??= ({
      'context-type': kDefaultContextObjFn,
      'receiver-resolution': kDefaultRecResFn
    });
  }
  function associate
    (n: AstDefinitionNode,
     context: () => ObjectType,
     recres: () => ReceiverResolutionN): DefinitionEntityFactory
  {
    const info = getEntityFunctionSet(n);
    info['receiver-resolution'] = recres;
    info['context-type'] = context;
    return inst;
  }
  function entityOf
    (node: AstDefinitionNode): ConstantEntity
  {
    return MelodyEntity.functionalizedFrom(getEntityFunctionSet(node));
  }

  const inst = freeze({ entityOf, associate });
  return inst;
}

export const DefinitionEntityFactory = freeze({ make });
