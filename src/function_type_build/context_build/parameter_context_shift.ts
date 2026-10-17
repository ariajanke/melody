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

import { CodeWriter } from '../../code_writer';
import { FunctionNamingSchema } from '../../function_naming_schema';
import { Helpers, StandardError } from '../../helpers';
import { CodeEmission, EmissionContext, FunctionType, MelodyComponentTypeString, ObjectType, RuntimeOnlyValue } from '../../melody_components';
import { FunctionTypeFactory } from '../function_type_association_set';
import { ParametersTypeRetrieval } from '../parameters_type_build';
import { TupleObjectType } from '../tuple_object_type';
import { ContextShift, ContextShiftAssociations } from './task_controller';

const { freeze, memoize } = Helpers;

const runtimeOnlyValue = memoize((): RuntimeOnlyValue => freeze({
  uid: memoize(Symbol),
  type: () => 'runtime-only-value'
}));

const additionalLookUps = memoize((): ReturnType<ContextShiftAssociations['additionalLookUps']> => []);
const allocations = memoize((): ReturnType<ContextShift['allocations']> => []);
// const stateIsFunctionType = (): MelodyComponentTypeString => 'function-type';

function make
  (mParameterTypes: ParametersTypeRetrieval)
  : ContextShift
{
  // pre-associated does not need the factory
  const { mapToFringeAccessor } = FunctionNamingSchema;
  const { emptyTuple } = TupleObjectType;
  let mLocalIdx = mParameterTypes.asType().sizeInStackItems() - 1;

  function pairIntoMethodPair(pair: [string, ObjectType]): [string, FunctionType] {
    const [vname, type] = pair;
    const localIdxStart = mLocalIdx;
    const localIdxEnd   = localIdxStart - type.sizeInStackItems();
    const emission: CodeEmission = freeze({
      uid: memoize(Symbol),
      type: () => 'code-emission',
      emit(writer: CodeWriter, _1: EmissionContext): void {
        for (let i = localIdxEnd + 1; i <= localIdxStart; ++i)
          { writer.getParameter(i); }
      }
    });

    const ftype: FunctionType = freeze({
      uid: memoize(Symbol),
      // type: stateIsFunctionType,
      emission: () => emission,
      immediate: runtimeOnlyValue,
      receiver: emptyTuple,
      parameters: emptyTuple,
      returns: () => type
    });

    return [mapToFringeAccessor(vname), ftype];
  }

  const additionalMethods = memoize((): Readonly<[string, FunctionType][]> =>
    mParameterTypes.orderedNameTypePairs().map(pairIntoMethodPair));

  const associations = memoize(() => freeze({
    additionalMethods, 
    additionalLookUps
  }));

  return freeze({
    associations,
    allocations,
    error: StandardError.raiseNoError
  });
}

export const ParameterContextShift = freeze({ make });
