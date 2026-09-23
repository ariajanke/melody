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
import { FunctionTypeBuild } from '../function_type_build';
import { Helpers, StandardError } from '../helpers';
import { ContextFrameSnapshot } from './context_frame_stack';
import { FunctionTypeBase } from './function_type_base';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

export const FringeFunctionBuild = freeze({
  make(mName: string, mTopSnapshot: ContextFrameSnapshot): FunctionTypeBuild {
    const { error, setErrorMessage } = StandardError.make();
    const { emptyTuple } = TupleObjectType;
    const { makeNewEmitlessEmpty, emitEmptyTuple } = FunctionTypeBase;

    const functionName =
      mName === FunctionNamingSchema.kContextName ?
      mName :
      FunctionNamingSchema.mapToFringeAccessor(mName);

    const originalFtype = memoize(() => mTopSnapshot.
      referenceType().
      lookUp(functionName)?.
      byParameters(emptyTuple()) ??
      setErrorMessage(`Cannot find function for "${mName}"`));

    const receiverFunctionType = memoize(() => {
      if (!originalFtype())
        { return undefined; }

      const { receiver } = originalFtype()!;

      return mTopSnapshot.
        receiverResolution().
        mapExpectedToReceiverAccessor(receiver()) ??
        setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
    });

    const functionType = memoize(() => {
      const originalHasNoReceiver =
        originalFtype()?.receiver().uid() === emptyTuple().uid();
      if (!originalFtype() || originalHasNoReceiver)
        { return originalFtype(); }

      return freeze({
        ...makeNewEmitlessEmpty(),
        returns: originalFtype()!.returns,
        simpleEmit(writer: CodeWriter) {
          originalFtype()!.
            emit(receiverFunctionType()!, emitEmptyTuple(), writer);
        }
      });
    });

    return freeze({ functionType, error });
  }
});
