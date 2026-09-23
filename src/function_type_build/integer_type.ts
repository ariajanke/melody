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
import { FunctionLookUpTable, ObjectType, FunctionType } from '../function_type_build';
import { Helpers } from '../helpers';
import { BuiltinTypeBase } from './builtin_type_base';
import { FunctionTypeBase } from './function_type_base';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

function make(): ObjectType {
  type CodeWriterFnName = 'addIntegers' | 'multiplyIntegers' | 'subtractIntegers';

  function mkOperation(writerFn: CodeWriterFnName): FunctionLookUpTable {
    const ftype = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: () => inst,
      parameters: () => inst,
      returns: () => inst,
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        receiverFtype.simpleEmit(writer);
        parameterFtype.simpleEmit(writer);
        writer[writerFn]();
      },
      simpleEmit(writer: CodeWriter): CodeWriter {
        return writer[writerFn]();
      }
    });

    return MutableFunctionTable.fromFunctionType(ftype);
  }

  const lookUpTable = memoize(():
    { [name: string | symbol]: FunctionLookUpTable | undefined } => 
    freeze({
    '+': mkOperation('addIntegers'),
    '*': mkOperation('multiplyIntegers'),
    '-': mkOperation('subtractIntegers')
  }));

  const inst = freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    name: () => 'Integer',
    lookUp(name: string | symbol): FunctionLookUpTable | undefined
      { return lookUpTable()[name]; },
  });

  return inst;
}

export const IntegerType = freeze({ instance: memoize(make) });
