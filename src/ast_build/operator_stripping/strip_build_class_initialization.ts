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

import { OperatorNamingSchema } from '../../operator_naming_schema';
import { Token } from '../../token';
import { AssignmentStripBuild } from './assignment_strip_build';
import { CallStripBuild } from './call_strip_build';
import { DotStripBuild } from './dot_strip_build';
import { LetMarkings } from './let_markings_stack';
import { LetStripBuild } from './let_strip_build';
import { StripBuild, StripBuildConstructor } from './strip_build';

function chooseSpecialization
  (callName: Token, markings: LetMarkings): StripBuildConstructor | undefined
{
  if (callName.content() === OperatorNamingSchema.kAssignment &&
      markings.isOutsideOfLetStatement())
  { return AssignmentStripBuild.make; }

  if (callName.content() === OperatorNamingSchema.kDot)
    { return DotStripBuild.make; }

  if (callName.content() === OperatorNamingSchema.kCall)
    { return CallStripBuild.make; }

  if (callName.content() === OperatorNamingSchema.kLet)
    { return LetStripBuild.make; }

  return undefined;
}

StripBuild.initializeThisClass({ chooseSpecialization });
