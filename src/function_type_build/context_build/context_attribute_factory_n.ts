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

import { Helpers, raise, StandardErrorMessage } from '../../helpers';
import { AstNode } from '../../ast_node';
import { CodeEmission, EmissionContext, ObjectType } from '../../function_type_build';
import { CodeWriter } from '../../code_writer';
import { WasmCompilation } from '../../wasm_compilation';
import { VariableOffset } from './variable_allocation';

const { freeze, memoize } = Helpers;

const kBytesPerWord = WasmCompilation.kWordSizeInBytes;

function pushAndAdd(writer: CodeWriter, offset: number) {
  if (offset === 0)
    { return; }

  writer.pushInteger(offset).addIntegers();
}

const AccessorEmission = freeze({
  make(mReceiver: ObjectType, mVariableOffset: VariableOffset): CodeEmission {
    const mAccessIndex = mVariableOffset.accessIndex;
    const mType = mVariableOffset.type;
    const mTypeSize = mType.sizeInStackItems();
    function emit(writer: CodeWriter, ctx: EmissionContext): void {
      const rec = ctx.popReceiver(mReceiver);
      for (let i = mTypeSize - 1; i >= 0; --i) {
        rec.emit(writer, ctx);
        pushAndAdd(writer, mAccessIndex + i*kBytesPerWord);
        writer.loadInteger();
      }
    }
    return freeze({ emit });
  }
});

function singleIteModifier
  (mReceiver: ObjectType, mVariableOffset: VariableOffset): CodeEmission['emit']
{
  const mType = mVariableOffset.type;
  if (mType.sizeInStackItems() !== 1)
    { raise('uh oh'); }

  return (writer: CodeWriter, ctx: EmissionContext): void => {
    ctx.popReceiver(mReceiver).emit(writer, ctx);
    pushAndAdd(writer, mVariableOffset.accessIndex);
    ctx.popParameters(mType).emit(writer, ctx);
    writer.storeInteger();
  };
}

function multiItemModifier
  (mReceiver: ObjectType, mVariableOffset: VariableOffset): CodeEmission['emit']
{
  const mType = mVariableOffset.type;
  const mAccessIndex = mVariableOffset.accessIndex;
  if (mType.sizeInStackItems() === 1)
    { raise('uh oh'); }

  return (writer: CodeWriter, ctx: EmissionContext): void => {
    ctx.popParameters(mType).emit(writer, ctx);
    const limit = mType.sizeInStackItems();
    const rec = ctx.popReceiver(mReceiver);
    for (let i = 0; i < limit; ++i) {    
      rec.emit(writer, ctx);
      pushAndAdd(writer, mAccessIndex + i*kBytesPerWord);
      writer.swapTopTwo().storeInteger();
    }
  };
}

const ModifierEmission = freeze({
  make(mReceiver: ObjectType, mVariableOffset: VariableOffset): CodeEmission {
    const ctor = mVariableOffset.type.sizeInStackItems() > 1 ?
      multiItemModifier : singleIteModifier;
    const emit = ctor(mReceiver, mVariableOffset);
    return freeze({ emit });
  }
});

function buildReceiverGetter
  (mVariableOffset: VariableOffset): CodeEmission
{
  if (mVariableOffset.type.sizeInStackItems() !== 1) {
    raise('a receiver must always be exactly one pointer/stack item in size');
  }
  const mAccessIndex = mVariableOffset.accessIndex;

  function emit(writer: CodeWriter, ctx: EmissionContext): void {
    writer.pushStackPointer();
    pushAndAdd(writer, mAccessIndex);
    writer.loadInteger();
  }

  return freeze({ emit });
}
