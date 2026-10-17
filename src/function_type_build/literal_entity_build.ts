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
import { Helpers, raise, StandardError, StandardErrorMessage } from '../helpers';
import { IntegerType } from './integer_type';
import { AstLiteralNode } from '../ast_node';
import {
  CodeEmission,
  ConstantEntity,
  EmissionContext,
  ImmediateValue,
  MelodyComponentTypeString,
  MelodyEntity
} from '../melody_components';
import { EntityBuild } from './fringe_entity_build';
import { Token } from '../token';

const { freeze, memoize } = Helpers;

interface LiteralStuff {
  hasValue(): unknown | undefined;
  asString(): string | undefined;
  asInteger(): number | undefined;
  emit(writer: CodeWriter, _1: EmissionContext): void;
  error(): StandardErrorMessage;
}

const toUndefined = () => undefined;

const LiteralStuff = freeze({
  forString(mToken: Token, mError: StandardError): LiteralStuff {
    return freeze({
      hasValue: mToken.content,
      asInteger: toUndefined,
      asString: mToken.content,
      emit(writer: CodeWriter, _1: EmissionContext)
        { writer.pushLiteralString(mToken.content()); },
      error: mError.error
    });
  },
  forNumber(mToken: Token, mError: StandardError): LiteralStuff {
    const { setErrorMessage, error } = mError;
    const numericValue = memoize((): number | undefined => {
      const literalString = mToken.content();
      const intValue = Number(literalString);
      if (isNaN(intValue)) {
        return setErrorMessage(`literal "${literalString}" is not a number`);
      }

      return intValue;
    });

    return freeze({
      hasValue: numericValue,
      asInteger: numericValue,
      asString: toUndefined,
      emit(writer: CodeWriter, _1: EmissionContext)
        { writer.pushInteger(numericValue() ?? raise('uh oh')); },
      error
    });
  }
});

const isCodeEmission = (): MelodyComponentTypeString => 'code-emission';
const isImmediateValue = (): MelodyComponentTypeString => 'immediate-value';

function make
  (mLiteralNode: AstLiteralNode,
   mError = StandardError.make())
  : EntityBuild
{
  const literalStuffCtor = (() => {
    if (mLiteralNode.type === 'number')
      { return LiteralStuff.forNumber; }

    return LiteralStuff.forString;
  });
  const {
    hasValue,
    asString,
    asInteger,
    emit,
    error
  } = literalStuffCtor()(mLiteralNode.token, mError);

  const entity = memoize((): ConstantEntity | undefined => {
    if (hasValue() === undefined)
      { return undefined; }

    const emission: CodeEmission = freeze({
      emit,
      type: isCodeEmission,
      uid: memoize(Symbol)
    });
    const immediate: ImmediateValue = freeze({
      asInteger,
      asString,
      asObjectType: toUndefined,
      type: isImmediateValue,
      uid: memoize(Symbol)
    });

    return MelodyEntity.constFrom(freeze({
      'code-emission': emission,
      'immediate-value': immediate,
      'object-type': IntegerType.instance()
    }));
  });

  return freeze({ entity, error });
}

export const LiteralEntityBuild = freeze({ make });
