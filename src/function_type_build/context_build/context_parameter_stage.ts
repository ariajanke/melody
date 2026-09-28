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

import { ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { ParametersTypeRetrieval } from '../parameters_type_build';
import { WritableObjectType } from './writable_object_type';

const { freeze, memoize } = Helpers;

interface ContextParameterStage_ {

  
};

function make
  (mIncompleteContextType: WritableObjectType,
   mParametersRetrieval: ParametersTypeRetrieval): ContextParameterStage_
{
  function nextContextType
    (incompleteContextType: WritableObjectType,
     [name, parameterType]: [string, ObjectType],
     index: number): WritableObjectType
  {
    // uh oh, we have a dependancy here to fix up for emissions
  }

  mParametersRetrieval.orderedNameTypePairs().reduce((), mIncompleteContextType);
}

const ContextParameterStage_ = freeze({ make });
