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
import { Helpers, StandardError, StandardErrorMessage } from '../helpers';
import { IntegerType } from './integer_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { ConstantStringType } from './constant_string_type';
import { AstLiteralNode } from '../ast_node';
import { CodeEmission, ConstantEntity, EmissionContext, FunctionType, ImmediateValue, MelodyComponentTypeString, MelodyComponentVisitor, MelodyEntity, StringToComponentTypeMap } from '../melody_components';
import { FunctionTypeFactory } from './function_type_association_set';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

// multiple records per node

interface EntityBuild {
  entity(): ConstantEntity | undefined;
  error(): StandardErrorMessage;
};

const InitialIntegerLiteralEntity = ({
  make(mLiteralNode: AstLiteralNode,
       mError = StandardError.make()
  ): EntityBuild {
    const { setErrorMessage, error } = mError;
    const numericValue = memoize((): number | undefined => {
      const literalString = mLiteralNode.token.content();
      const intValue = Number(literalString);
      if (isNaN(intValue)) {
        return setErrorMessage(`literal "${literalString}" is not a number`);
      }

      return intValue;
    });

    const entity = memoize((): ConstantEntity | undefined => {
      if (numericValue() === undefined)
        { return undefined; }

      const intValue = numericValue()!;
      const emission: CodeEmission = freeze({
        emit(writer: CodeWriter, _1: EmissionContext)
          { writer.pushInteger(intValue); },
        type: () => 'code-emission',
        uid: memoize(Symbol)
      });
      const immediate: ImmediateValue = freeze({
        asInteger: numericValue,
        asObjectType: () => undefined,
        type: () => 'immediate-value',
        uid: memoize(Symbol)
      });
      const functionType: FunctionType = freeze({
        receiver: TupleObjectType.emptyTuple,
        parameters: TupleObjectType.emptyTuple,
        returns: IntegerType.instance,
        emission: (): CodeEmission => emission,
        immediate: (): ImmediateValue => immediate,
        type: () => 'function-type',
        uid: memoize(Symbol)
      });

      return MelodyEntity.constFrom(freeze({
        'code-emission': emission,
        'immediate-value': immediate,
        'function-type': functionType,
        'object-type': IntegerType.instance()
      }));
    });

    return freeze({ entity, error });
  }
});

const klass = freeze({
  makeSuccessFromType: (ftype: FunctionType): FunctionTypeBuild =>
    FunctionTypeBuildBase.makeSuccessFromType(ftype),
  makeForInteger: (int_: string) =>
    klass.makeSuccessFromType(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: IntegerType.instance,
      simpleEmit: (writer: CodeWriter) =>
        writer.pushInteger(Number(int_))
    })),
  makeForString: (string_: string) => {
    return klass.makeSuccessFromType(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: ConstantStringType.instance,
      simpleEmit: (writer: CodeWriter) =>
        writer.pushLiteralString(string_)
    }));
  }
});

export const LiteralFunctionTypeBuild = klass;
