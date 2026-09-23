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
import { FunctionType } from '../../function_type_build';
import { Helpers, raise } from '../../helpers';
import { FunctionTypeBase } from '../function_type_base';
import { CodeWriter } from '../../code_writer';
import { OperatorNamingSchema } from '../../operator_naming_schema';
import { TupleObjectType } from '../tuple_object_type';

const { freeze } = Helpers;

function wrappedIndexGetterOf(originalIndexGetter: FunctionType): FunctionType {
  const { emptyTuple } = TupleObjectType;
  const { emitEmptyTuple, makeNewEmitlessEmpty } = FunctionTypeBase;

  const selfRefFtype = originalIndexGetter.
    receiver().
    lookUp(FunctionNamingSchema.kContextName)?.
    byParameters(emptyTuple()) ??
    raise('uh oh');

  return freeze({
    ...makeNewEmitlessEmpty(),
    returns: originalIndexGetter.returns,
    simpleEmit(writer: CodeWriter) {
      originalIndexGetter.emit(selfRefFtype, emitEmptyTuple(), writer);
    }
  });
}

function make
  (mPossibleIndexGetter: FunctionType)
  : FunctionType | undefined
{
  const lookUp = mPossibleIndexGetter.returns().
    lookUp(OperatorNamingSchema.kCall);
  if (!lookUp)
    { return undefined; }

  // NOTE there must be exactly one ftype in this table
  //      having more means more than one signature and
  //      a single index cannot support that
  const representativeFtype = lookUp.uniqueFunctionType() ??
    raise('cannot support more than one index');

  const { emitEmptyTuple, makeNewEmitlessEmpty } = FunctionTypeBase;
  
  const isOriginal =
    mPossibleIndexGetter.receiver().uid() === representativeFtype.receiver().uid();
  const wrappedIndexGetter =
    !isOriginal ? wrappedIndexGetterOf(mPossibleIndexGetter) : undefined;
    
  const emit = (receiverFtype: FunctionType,
                parameterFtype: FunctionType,
                writer: CodeWriter): void =>
  {
    receiverFtype.simpleEmit(writer);
    parameterFtype.simpleEmit(writer);

    if (wrappedIndexGetter) {
      wrappedIndexGetter.simpleEmit(writer);
    } else {
      mPossibleIndexGetter.emit(receiverFtype, emitEmptyTuple(), writer);
    }
    writer.indirectCall(representativeFtype);
  };
    
  return freeze({
    ...makeNewEmitlessEmpty(),
    // TODO capture in testing that this is correct
    receiver: () => representativeFtype.receiver(),
    // NOTE only one set of params/returns supported so far
    //      returns: empty
    //      parameters: empty
    emit
  });
}

export const CallAttributeCreation = freeze({ of: make });
