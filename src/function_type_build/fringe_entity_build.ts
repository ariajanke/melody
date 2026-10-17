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

import { AstIdentifierNode } from '../ast_node';
import { CodeWriter } from '../code_writer';
import { FunctionNamingSchema } from '../function_naming_schema';
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import {
  CodeEmission,
  ConstantEntity,
  EmissionContext,
  FunctionType,
  ImmediateValue,
  MelodyEntity, 
  RuntimeOnlyValue
} from '../melody_components';
import { ReceiverResolution } from './context_build';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

export interface EntityBuild {
  entity(): ConstantEntity | undefined;
  error(): StandardErrorMessage;
};

function immediateValueOf(ftype: FunctionType): ImmediateValue | undefined {
  const imm = ftype.immediate();
  if (!imm)
    { return imm; }

  if (imm.type() === 'immediate-value')
    { return imm as ImmediateValue; }

  return undefined;
}

function make
  (mIdentifierNode: AstIdentifierNode,
   mContextEntity: ConstantEntity,
   mReceiverResolution: ReceiverResolution,
   mError: StandardError = StandardError.make())
  : EntityBuild
{
  const { setErrorMessage, error } = mError;
  const { emptyTuple } = TupleObjectType;
  const mName = mIdentifierNode.token.content();
  const mFunctionName =
    mName === FunctionNamingSchema.kContextName ?
    mName :
    FunctionNamingSchema.mapToFringeAccessor(mName);

  const mContextType = mContextEntity.get('object-type');
  const originalFtype = memoize((): FunctionType | undefined =>
    mContextType?.
    lookUp(mFunctionName)?.
    byParameters(emptyTuple()) ??
    setErrorMessage(`Cannot find function for "${mName}"`));

  const receiverFunctionType = memoize((): FunctionType | undefined => {
    if (!originalFtype())
      { return undefined; }

    const { receiver } = originalFtype()!;

    return mReceiverResolution.
      mapExpectedToReceiverAccessor(receiver()) ??
      setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
  });

  const emission = memoize((): CodeEmission | undefined => {
    const orgEm = originalFtype()?.emission() ??
      raise('cannot get original emission');

    if (originalFtype()!.receiver().uid() !== emptyTuple().uid()) {
      const recEm = receiverFunctionType()?.emission() ??
        raise('cannot get receiver emission');      
      return freeze({
        uid: memoize(Symbol),
        type: () => 'code-emission',
        emit(writer: CodeWriter, ctx: EmissionContext): void {
          ctx.pushReceiver( receiverFunctionType()!.returns(), recEm );
          orgEm.emit(writer, ctx);
        }
      });
    }

    return orgEm;
  });

  const entity = memoize((): ConstantEntity | undefined => {
    if (!originalFtype())
      { return undefined; }

    const immValue = immediateValueOf(originalFtype()!);
    if (immValue) {
      return MelodyEntity.constFrom({
        'object-type': originalFtype()!.returns(),
        'immediate-value': immValue
      });
    }

    return MelodyEntity.functionalizedFrom({
      'code-emission': emission,
      'object-type': originalFtype()!.returns,
      'runtime-only-value': RuntimeOnlyValue.instance,
    });
  });

  return freeze({ entity, error });
}

export const FringeEntityBuild = freeze({ make });
