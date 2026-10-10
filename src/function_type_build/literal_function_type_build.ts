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
import { Helpers, StandardErrorMessage } from '../helpers';
import { IntegerType } from './integer_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { ConstantStringType } from './builtin_type_base';
import { AstLiteralNode } from '../ast_node';
import { CodeEmission, EmissionContext, FunctionType, ImmediateValue, MelodyComponentVisitor } from '../melody_components';
import { FunctionTypeFactory } from './function_type_association_set';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

// multiple records per node


const IntegerLiteralThings = ({
  make(mLiteralNode: AstLiteralNode,
       
  ): RecordsRetrieval {

    const numericValue = memoize((): number | undefined => {
      const intValue = Number(mLiteralNode.token.content());
      if (isNaN(intValue)) {
        // error out
      }
    });

    const entity = memoize(() => {
      if (numericValue() === undefined)
        { return undefined; }

      const intValue = numericValue()!;
      function emit(writer: CodeWriter, _1: EmissionContext)
        { writer.pushInteger(intValue); }

      const emission = freeze({
        emit,
        visit<T>(visitor: MelodyComponentVisitor<T>): T
          { return visitor.visitCodeEmission(emission); },
        uid: memoize(Symbol)
      });
      const immediate = freeze({
        asInteger: numericValue,
        asObjectType: () => undefined,
        visit<T>(visitor: MelodyComponentVisitor<T>): T
          { return visitor.visitImmediateValue(immediate); },
        uid: memoize(Symbol)
      });
      const inst = freeze({
        receiver: TupleObjectType.emptyTuple,
        parameters: TupleObjectType.emptyTuple,
        returns: IntegerType.instance,
        emission: (): CodeEmission => emission,
        immediate: (): ImmediateValue => immediate,
        visit<T>(visitor: MelodyComponentVisitor<T>): T
          { return visitor.visitFunctionType(inst); },
        uid: memoize(Symbol)
      });
      return inst;
    });

    
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
