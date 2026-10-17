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
import { Helpers, raise, StandardError } from '../helpers';
import { ConstantEntity, FunctionType } from '../melody_components';
import { OperatorNamingSchema } from '../operator_naming_schema';
import { Token } from '../token';
import { ReceiverResolution } from './context_build';
import { EntityBuild } from './fringe_entity_build';

const { freeze, memoize } = Helpers;
const { kAssignment } = OperatorNamingSchema;
const kAssignmentNotAValidCallName =
  `"${kAssignment}" is not a valid call name, DAST build should have ` +
  `stripped it out and replaced it with the appropriate fringe accessor`;

function make
  (mCallName: Token,
   mReceiverEntity: ConstantEntity,
   mParametersEntity: ConstantEntity,
   mContextEntity: ConstantEntity,
   mReceiverResolution: ReceiverResolution,
   mError: StandardError = StandardError.make())
  : EntityBuild
{
  const { setErrorMessage, error } = mError;
  
  const callNameStr = memoize((): string | undefined => {
    const callName = mCallName.content();
    if (callName === kAssignment) {
      raise(kAssignmentNotAValidCallName);
    }

    return callName;
  });

  const mContextType =
    mContextEntity.get('object-type') ??
    raise('context entity must map to an object type');
  const contextSelfFtype = () =>
    mReceiverResolution.
    mapExpectedToReceiverAccessor(mContextType) ??
    raise('no self reference function <context>');
  const parameterType = () =>
    mParametersEntity.get('object-type') ??
    raise('parameter object type is needed');
  const receiverFtype = () => {};

  const callFunctionType = memoize((): FunctionType | undefined => {
    if (!callNameStr())
      { return undefined; }

    const callFunctionType = mReceiverEntity.
      get('object-type')?.
      lookUp(callNameStr()!)?.
      byParameters( parameterType() );
    if (!callFunctionType) {
      // const msg =
      //   `cannot find function "${callNameStr()}" ` +
      //   `on receiver "${mReceiver.asString()}" ` +
      //   `(type: "${lexicalReceiver()!.returns().name()}") ` +
      //   `for args "${mArgs.asString()}"`;
      // return setErrorMessage(msg);
      // missing method
      return undefined;
    }

    return callFunctionType;
  });

  const receiverFtype = memoize((): FunctionType | undefined => {
    if (!callFunctionType())
      { return undefined; }

    if (contextSelfFtype().uid() !== lexicalReceiver()?.uid())
      { return lexicalReceiver(); }

    const rec = callFunctionType()!.receiver();
    const ftype = mContext.receiverResolution().
      mapExpectedToReceiverAccessor(rec);
    if (!ftype) {
      return setErrorMessage(`Cannot resolve receiver for function ` +
                             `'${callNameStr()}' on type '${rec.name()}'`);
    }

    if (ftype.receiver().uid() !== emptyTuple().uid())
      { raise('Receiver resolution is behaving poorly'); }
    return ftype;
  });
}