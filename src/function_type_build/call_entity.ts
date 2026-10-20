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
import { Helpers, raise } from '../helpers';
import { CodeEmission, ConstantEntity, EmissionContext, FunctionType, ImmediateValue, MelodyEntity, RuntimeOnlyValue } from '../melody_components';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { ReceiverResolution } from './context_build';
import { EntityError } from './entity_error';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize, softMemoize } = Helpers;
const { kAssignment } = OperatorNamingSchema;
const kAssignmentNotAValidCallName =
  `"${kAssignment}" is not a valid call name, DAST build should have ` +
  `stripped it out and replaced it with the appropriate fringe accessor`;

function make
  (mCallName: Token,
   mReceiverEntity: ConstantEntity,
   mParametersEntity: ConstantEntity,
   mReceiverResolutionFn: () => ReceiverResolution)
  : ConstantEntity
{
  const { setErrorMessage, error } = EntityError.make();
  const { emptyTuple } = TupleObjectType;
  
  const callNameStr = memoize((): string | undefined => {
    const callName = mCallName.content();
    if (callName === kAssignment) {
      raise(kAssignmentNotAValidCallName);
    }

    return callName;
  });

  const parameterType = () =>
    mParametersEntity.get('object-type') ??
    raise('parameter entity is missing object type');

  const receiverType = () =>
    mReceiverEntity.get('object-type') ??
    raise('receiver object type is needed');
  
  const originalFtype = memoize((): FunctionType | undefined => {
    if (callNameStr() === undefined)
      { return undefined; }

    return receiverType().
      lookUp(callNameStr()!)?.
      byParameters(parameterType()) ??
      setErrorMessage(
        `Cannot find function "${callNameStr()!}" taking a ` +
        `"${parameterType().name()}" ` +
        `on receiver type "${receiverType().name()}"`);
  });

  const receiverFunctionType = memoize((): FunctionType | undefined => {
    if (!originalFtype())
      { return undefined; }

    const { receiver } = originalFtype() as FunctionType;

    return mReceiverResolutionFn().
      mapExpectedToReceiverAccessor(receiver()) ??
      setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
  });

  const emission = softMemoize((): CodeEmission | undefined => {
    const orgEm = originalFtype()?.emission();
    
    const needsReceiverOrParameters =
      emptyTuple().uid() != parameterType().uid() ||
      emptyTuple().uid() != receiverType().uid();

    if (!needsReceiverOrParameters || !orgEm)
      { return orgEm; }

    const recEm = receiverFunctionType()?.emission();
    const prmEm = mParametersEntity.get('code-emission');
    if (!recEm || !prmEm)
      { return undefined; }
    
    return freeze({
      uid: memoize(Symbol),
      type: () => 'code-emission',
      emit(writer: CodeWriter, ctx: EmissionContext): void {
        ctx.pushReceiver( receiverFunctionType()!.returns(), recEm );
        ctx.pushParameters( parameterType(), prmEm );
        orgEm.emit(writer, ctx);
      }
    });
  });

  const immediateValue = memoize((): ImmediateValue | undefined => {
    const recValue = mReceiverEntity.get('immediate-value');
    const prmValue = mParametersEntity.get('immediate-value');
    const imfn = originalFtype()?.immediateCallable();
    if (!recValue || !prmValue || !imfn)
      { return undefined; }

    return imfn.call(recValue, prmValue);
  });

  const runtimeOnlyValue = memoize((): RuntimeOnlyValue | undefined => {
    const recRtV = mReceiverEntity.get('runtime-only-value');
    const prmRtV = mParametersEntity.get('runtime-only-value');
    /* as Melody, this could be a tuple call:
    let (recRtV, prmRtV) = (mReceiverEntity, mParametersEntity).get('runtime-only-value')
    */
    const fnIsRtOnly = originalFtype()?.immediateCallable() === undefined;
    const fnAsRtV = fnIsRtOnly ? RuntimeOnlyValue.instance() : undefined;
    return recRtV ?? prmRtV ?? fnAsRtV;
  });

  return MelodyEntity.functionalizedFrom({
    'error': error,
    'code-emission': emission,
    'immediate-value': immediateValue,
    'runtime-only-value': runtimeOnlyValue,
    'object-type': originalFtype()!.returns
  });
}

export const CallEntity = freeze({ make });
