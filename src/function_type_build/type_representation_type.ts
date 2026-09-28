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

import { ObjectType } from '../function_type_build';
import { Helpers, raise, StandardErrorMessage } from '../helpers';

export interface TypeRepresentationInstance {
  resultantType(): ObjectType | undefined;
  error(): StandardErrorMessage;
  lookUp(callName: string, parameterType: ObjectType)
    : TypeRepresentationInstance;
};

const { freeze, memoize } = Helpers;

export const TypeRepresentationInstance = freeze({
  make(mResultantType: ObjectType,
       mParent: TypeRepresentationType)
    : TypeRepresentationInstance
  {
    function lookUp
      (callName: string, parameterType: ObjectType): TypeRepresentationInstance
    {
      const rtype = mResultantType.
        lookUp(callName)?.
        byParameters(parameterType)?.
        returns();
      if (!rtype) {
        const tname = mResultantType.name();
        return makeErrorRepresentation(`${callName} is not defined for ${tname} type`);
      }

      return mParent.instanceFor(rtype);
    }

    return freeze({
      resultantType: () => mResultantType,
      error: () => raise(`Is "${mResultantType.name()}" not an error!`),
      lookUp
    });
  }
});

type MapTypeToRepresentation =
  { [objectTypeUid: symbol]: TypeRepresentationInstance | undefined };

function makeErrorRepresentation(message: string): TypeRepresentationInstance {
  const resultantType = () => undefined;

  const lookUp =
    (_0: string, _1: ObjectType): TypeRepresentationInstance =>
  { return inst; };

  const inst = freeze({
    resultantType,
    error: memoize(() => freeze({ message })),
    lookUp
  });
  return inst;
}

export interface TypeRepresentationType {
  instanceFor(type: ObjectType): TypeRepresentationInstance;
};

function make(): TypeRepresentationType {
  const mTypeToRepMap: MapTypeToRepresentation = {};

  function registerType(type: ObjectType): TypeRepresentationInstance {
    if (mTypeToRepMap[type.uid()])
      { raise('cannot re-register type'); }

    const rep = TypeRepresentationInstance.make(type, inst);
    mTypeToRepMap[type.uid()] = rep;
    return rep;
  }

  function instanceFor(type: ObjectType): TypeRepresentationInstance {
    const rep = mTypeToRepMap[type.uid()];
    if (rep)
      { return rep; }

    return registerType(type);
  }

  const inst = freeze({ instanceFor });
  return inst;
}

export const TypeRepresentationType = freeze({
  instance: memoize(make),
  makeErrorRepresentation,
  forTesting: { make }
});
