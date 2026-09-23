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
import { FunctionLookUpTable, FunctionType, ObjectType } from '../function_type_build';
import { Helpers, raise } from '../helpers';
import { IntegerType } from './integer_type';
import { FunctionTypeBase } from './function_type_base';
import { ConstantStringType } from './builtin_type_base';
import { LiteralFunctionTypeBuild } from './literal_function_type_build';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

const emitNlFtype = memoize(() =>
  LiteralFunctionTypeBuild.makeForString('\n').functionType()!);

const kSystemIOUid = Symbol();

// TODO accept nested tuples
function make(): FunctionLookUpTable {
  const mIntegerType = IntegerType.instance;
  const mStringType = ConstantStringType.instance;

  type CodeWriterFuncName = 'printInteger' | 'printString';

  type MappingEntry = FunctionType | 'notSupported' | undefined;
  
  const mParameterMapping: { [uid: symbol]: MappingEntry } = {};

  function writerFor
    (type: ObjectType): CodeWriterFuncName | undefined
  {
    if (type.uid() === mIntegerType().uid()) {
      return 'printInteger';
    } else if (type.uid() === mStringType().uid()) {
      return 'printString';
    }
    return undefined;
  }

  function writersFor
    (type: ObjectType): Readonly<CodeWriterFuncName[]> | undefined
  {
    const detuped = type.detuplify();
    if (!detuped) {
      const w = writerFor(type);
      return w ? [w] : undefined;
    }

    return detuped.reduce((arr: CodeWriterFuncName[] | undefined, type: ObjectType) => {
      if (!arr)
        { return arr; }

      const w = writerFor(type);
      if (!w)
        { return w; }

      arr.push(w);
      return arr;
    }, []);
  }

  const emitFor = (type: ObjectType): ((cw: CodeWriter) => void) | undefined =>
    writersFor(type)?.
      reduce((p: (cw: CodeWriter) => void, c: CodeWriterFuncName) => {
        return (cw: CodeWriter) => {
          p(cw);
          cw[c]();
        };
    }, (_0: CodeWriter) => {});

  function makePutsFunctionFor(type: ObjectType): MappingEntry {
    const emissionFunc = emitFor(type);
    if (!emissionFunc)
      { return 'notSupported'; }

    const { emptyTuple } = TupleObjectType;

    const rv: FunctionType = freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      parameters: () => type,
      emit(receiverFtype: FunctionType,
           parameterFtype: FunctionType,
           writer: CodeWriter): void
      {
        const recUid = receiverFtype.returns().uid();
        if (recUid !== kSystemIOUid &&
            recUid !== emptyTuple().uid())
        { raise('receiver assumptions'); }
        if (parameterFtype.returns().uid() !== type.uid() ||
            parameterFtype.receiver().uid() !== emptyTuple().uid() ||
            parameterFtype.parameters().uid() !== emptyTuple().uid())
        { raise('parameter assumptions'); }
        parameterFtype.simpleEmit(writer);
        emissionFunc(writer);

        emitNlFtype().simpleEmit(writer);
        writer.printString();
      },
    });
    return rv;
  }

  return freeze({
    uniqueFunctionType: (): FunctionType | undefined => undefined,
    byParameters(type: ObjectType): FunctionType | undefined {
      const found =
        mParameterMapping[type.uid()] ??=
        makePutsFunctionFor(type);
      if (found === 'notSupported')
        { return undefined; }
      return found;
    }
  });
}

export const PutsFunctionLookUpTable = freeze({
  make,
  instance: memoize(make),
  kSystemIOUid
});
