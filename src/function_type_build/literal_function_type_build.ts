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
import { Helpers } from '../helpers';
import { IntegerType } from './integer_type';
import { FunctionTypeBase } from './function_type_base';
import { FunctionTypeBuildBase } from './function_type_build_base';
import { ConstantStringType } from './builtin_type_base';
import { FunctionType, FunctionTypeBuild } from '../function_type_build';

const { freeze } = Helpers;

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
