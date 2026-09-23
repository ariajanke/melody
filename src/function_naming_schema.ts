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

import { Helpers, raise, InternalNaming } from './helpers';
import { OperatorNamingSchema } from './operator_naming_schema';

const { freeze } = Helpers;

const kInitialSetNamePrefix = '<initSet>:';

function mapToInitialSetName(names: string | readonly string[]): string {  
  if (typeof names === 'string') {
    if (names.indexOf(kInitialSetNamePrefix) === 0) {
      raise(`Unexpected initial set name "${names}"`);
    }
    return `${kInitialSetNamePrefix}(${names})`;
  }
  return mapToInitialSetName(names.join(','));
}

const { mapToInternalName } = InternalNaming;
const kAssignmentOperator = OperatorNamingSchema.kAssignment;

export type ContextFunctionGroup = 'initialSet' | 'assignment' | 'accessor';

export const FunctionNamingSchema = freeze({
  kContextName: mapToInternalName('context'),
  kParentName: mapToInternalName('parent'),
  kNoneName: mapToInternalName('none'),
  uniqueFrameNameFor(n: number): string { return mapToInternalName(`frame:${n}`); },
  mapToInternalName,
  mapToInitialSetName,
  mapFromFringeAccessor: (name: string): string | undefined =>
    name[0] === '.' ? name.slice(1) : undefined,
  mapToAssignment: (name: string): string =>
    `${name}${kAssignmentOperator}`,
  mapToFringeAccessor: (name: string) => `.${name}`,
  isAnInitialSetName: (name: string): boolean =>
    name.indexOf(kInitialSetNamePrefix) === 0,
  isAnAssignmentName: (name: string): boolean =>
    name.endsWith(kAssignmentOperator),
  isAFringeAccessorName: (name: string): boolean =>
    name[0] === '.' && !name.endsWith(kAssignmentOperator)
});
