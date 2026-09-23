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

import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { BuiltinTypeBase, ConstantStringType } from './builtin_type_base';
import { PutsFunctionLookUpTable } from './puts_function_look_up_table';
import { FunctionTypeBase } from './function_type_base';
import { IntegerType } from './integer_type';
import { CodeWriter } from '../code_writer';
import { MutableFunctionTable } from './mutable_function_table';

const { freeze, memoize } = Helpers;

function make(): ObjectType {
  function makeAskFunction
    (name: 'askInteger' | 'askString', type: () => ObjectType): FunctionType
  {
    return freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      returns: type,
      simpleEmit(writer: CodeWriter) {
        writer[name]();
      }
    });
  }

  const assignableFtype = memoize((): FunctionType => freeze({
    ...FunctionTypeBase.makeNewEmitlessEmpty(),
    parameters: IntegerType.instance,
    returns: IntegerType.instance,
    emit(receiverFtype: FunctionType,
         parameterFtype: FunctionType,
         writer: CodeWriter): void
    {
      if (receiverFtype.returns().uid() !== inst.uid())
        { raise('receiver assumptions'); }

      if (parameterFtype.returns().uid() !== IntegerType.instance().uid())
        { raise('parameter assumptions'); }

      writer.pushLiteralString('\n');
      parameterFtype.simpleEmit(writer);
      writer.pushLiteralString('SystemIO assignable set with ');

      writer.printString().printInteger().printString();
      parameterFtype.simpleEmit(writer);
    }
  }));

  const { fromFunctionType } = MutableFunctionTable;

  const lookUpTable = memoize(():
    { [name: string | symbol]: FunctionLookUpTable | undefined } => 
    freeze({
      '.self': fromFunctionType(selfGetter()),
      'assignable:=': fromFunctionType(assignableFtype()),
      'askInteger': fromFunctionType(makeAskFunction('askInteger', IntegerType.instance)),
      'askString': fromFunctionType(makeAskFunction('askString', ConstantStringType.instance)),
      'puts': PutsFunctionLookUpTable.instance()
    }));

  const inst = freeze({
    ...BuiltinTypeBase.makeNewWithDefaults(),
    uid: () => PutsFunctionLookUpTable.kSystemIOUid,
    sizeInBytes: () => 0,
    sizeInStackItems: () => 0,
    name: () => 'SystemIO',
    lookUp(name: string | symbol): FunctionLookUpTable | undefined
      { return lookUpTable()[name]; },
  });

  return inst;
}

const selfGetter = memoize((): FunctionType => freeze({
  ...FunctionTypeBase.makeNewEmitlessEmpty(),
  returns: SystemIoType.instance,
  simpleEmit(_0: CodeWriter) {}
}));

export const SystemIoType = freeze({ instance: memoize(make), selfGetter });
