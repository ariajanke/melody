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
  NodeError, 
  ObjectType, 
  ReceiverResolutionN, 
  RuntimeOnlyValue
} from '../melody_components';
import { ReceiverResolution } from './context_build';
import { EntityError } from './entity_error';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize, softMemoize } = Helpers;

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
   mContextEntity: ConstantEntity)
  : ConstantEntity
{
  const { setErrorMessage, error } = EntityError.make();
  const { emptyTuple } = TupleObjectType;
  const mName = mIdentifierNode.token.content();
  const mFunctionName =
    mName === FunctionNamingSchema.kContextName ?
    mName :
    FunctionNamingSchema.mapToFringeAccessor(mName);

  const contextType = (): ObjectType =>
    mContextEntity.get('context-type') ?? raise('called too soon');

  const receiverResolution = (): ReceiverResolutionN =>
    mContextEntity.get('receiver-resolution') ?? raise('called too soon');

  const originalFtype = memoize((): FunctionType | undefined =>
    contextType().
    lookUp(mFunctionName)?.
    byParameters(emptyTuple()) ??
    setErrorMessage(`Cannot find function for "${mName}"`));

  const receiverFunctionType = memoize((): FunctionType | undefined => {
    if (!originalFtype())
      { return undefined; }

    const { receiver } = originalFtype()!;

    return receiverResolution().
      mapExpectedToReceiverAccessor(receiver()) ??
      setErrorMessage(`Cannot find receiver '${receiver().name()}'`);
  });

  const needsReceiver = (): boolean =>
    originalFtype()!.receiver().uid() !== emptyTuple().uid();

  const emission = softMemoize((): CodeEmission | undefined => {
    const orgEm = originalFtype()?.emission();
    const recEm = receiverFunctionType()?.emission();
    if (!orgEm || !recEm)
      { return undefined; }

    if (needsReceiver()) {
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

  const immediateValue = memoize((): ImmediateValue | undefined => {
    if (!originalFtype())
      { return undefined; }

    return immediateValueOf(originalFtype()!);
  });

  return MelodyEntity.functionalizedFrom({
    'error': error,
    'code-emission': emission,
    'object-type': originalFtype()!.returns,
    'immediate-value': immediateValue
  });
}

export const FringeEntity = freeze({ make });
