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

import { Helpers, StandardErrorMessage } from '../../helpers';
import { ObjectType } from '../../melody_components';
import { ContextShiftAssociations } from './task_controller';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

function make
  (mAdditions: ContextShiftAssociations,
   mAllocations: Readonly<Readonly<[string, ObjectType]>[]>,
   mWritableContext: WritableObjectType)
{
  // not necessarily concerned with code emission still
}