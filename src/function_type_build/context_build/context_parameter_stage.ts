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

import { FunctionNamingSchema } from '../../function_naming_schema';
import { ObjectType } from '../../function_type_build';
import { Helpers } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { ParametersTypeRetrieval } from '../parameters_type_build';
import { WritableObjectType } from './writable_object_type';
import { CodeWriter } from '../../code_writer';
import { MutableFunctionTable } from '../mutable_function_table';
import { ContextDeclarationBuild_ } from './context_declaration_build';
import { NameDeclaration } from '../context_base_names_set/declaration_names_retrieval';
import { ProgressiveVariableAllocation } from './variable_allocation';

const { freeze, memoize } = Helpers;

export interface ContextParameterStage_ {
  next(declarations: Readonly<NameDeclaration[]>): ContextDeclarationBuild_;
};

function make
  (mIncompleteContextType: WritableObjectType,
   mParametersRetrieval: ParametersTypeRetrieval,
   mVariableAllocation: ProgressiveVariableAllocation): ContextParameterStage_
{
  let mLocalIdx = 0;
  function nextContextType
    (incompleteContextType: WritableObjectType,
     [name, parameterType]: [string, ObjectType]): WritableObjectType
  {
    const localIdxStart = mLocalIdx;
    const localIdxEnd   = localIdxStart + parameterType.sizeInStackItems();
    const getter = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: () => parameterType,
      simpleEmit(writer: CodeWriter) {
        for (let i = localIdxStart; i < localIdxEnd; ++i) {
          writer.getParameter(i);
        }
      }
    });
    mLocalIdx = localIdxEnd;
    const lookUpTbl = MutableFunctionTable.fromFunctionType(getter);
    return incompleteContextType.
      setFunctionLookUp(FunctionNamingSchema.mapToFringeAccessor(name),
                        lookUpTbl);
  }

  const writableReferenceType = memoize((): WritableObjectType =>
    mParametersRetrieval.
    orderedNameTypePairs().
    reduce(nextContextType, mIncompleteContextType));

  function next(declarations: Readonly<NameDeclaration[]>): ContextDeclarationBuild_ {
    return ContextDeclarationBuild_.
      make(mVariableAllocation, declarations, writableReferenceType());
  }

  return freeze({ next });
}

export const ContextParameterStage_ = freeze({ make });
