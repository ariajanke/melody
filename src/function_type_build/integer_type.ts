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
import { Helpers, raise } from '../helpers';
import {
  EmissionContext,
  FunctionLookUpTable,
  FunctionType,
  ImmediateValue,
  MelodyComponentVisitor,
  ObjectType
} from '../melody_components';
import { WasmCompilation } from '../wasm_compilation';
// import { BuiltinTypeBase } from './builtin_type_base';
import { MutableFunctionTable } from './mutable_function_table';
import { TupleObjectType } from './tuple_object_type';

const { freeze, memoize } = Helpers;

type CodeWriterFnName = 'addIntegers' | 'multiplyIntegers' | 'subtractIntegers';

function makeBinaryOperator
  (callName: CodeWriterFnName,
   imfImpl: (lhs: number, rhs: number) => number,
   thisType: () => ObjectType)
  : FunctionType
{
  const imf = freeze({
    uid: memoize(Symbol),
    visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
      visitor.visitImmediateFunction(imf),
    call(receiver: ImmediateValue, parameters: ImmediateValue): ImmediateValue {
      const rint = receiver.asInteger();
      const pint = parameters.asInteger();
      if (rint === undefined ||
          pint === undefined)
      { raise(`cannot call ${callName}, your immediates are not integers`); }

      const imv: ImmediateValue = freeze({
        uid: memoize(Symbol),
        visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
          visitor.visitImmediateValue(imv),
        asInteger: (): number | undefined => imfImpl(rint, pint),
        asObjectType: (): ObjectType | undefined => undefined
      });
      return imv;
    }
  });

  const emission = freeze({
    uid: memoize(Symbol),
    visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
      visitor.visitCodeEmission(emission),
    emit(writer: CodeWriter, ctx: EmissionContext): void {
      const rec = ctx.popReceiver(thisType());
      const prm = ctx.popParameters(thisType());
      rec.emit(writer, ctx);
      prm.emit(writer, ctx);
      writer[callName]();
    }
  });

  const ftype = freeze({
    emission: () => emission,
    immediate: () => imf,
    uid: memoize(Symbol),
    visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
      visitor.visitFunctionType(ftype),
    receiver: thisType,
    parameters: thisType,
    returns:  thisType
  });
  return ftype;
}

const addition = memoize((): FunctionType =>
  makeBinaryOperator('addIntegers',
                     (lhs: number, rhs: number) => lhs + rhs,
                     IntegerType.instance));
const subtraction = memoize((): FunctionType =>
  makeBinaryOperator('subtractIntegers',
                     (lhs: number, rhs: number) => lhs - rhs,
                     IntegerType.instance));
const multiplication = memoize((): FunctionType =>
  makeBinaryOperator('multiplyIntegers',
                     (lhs: number, rhs: number) => lhs*rhs,
                     IntegerType.instance));

const objectTypeGetter = memoize((): FunctionType => {
  const immediateValue = freeze({
    asInteger: () => undefined,
    asObjectType: IntegerType.instance,
    uid: memoize(Symbol),
    visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
      visitor.visitImmediateValue(immediateValue),
  });
  const ftype = freeze({
    emission: () => undefined,
    immediate: () => immediateValue,
    uid: memoize(Symbol),
    visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
      visitor.visitFunctionType(ftype),
    receiver: TupleObjectType.emptyTuple,
    parameters: TupleObjectType.emptyTuple,
    returns: ObjectType.instance
  });
  return ftype;
});

function make(): ObjectType {
  const { fromFunctionType } = MutableFunctionTable;

  const lookUpTable = memoize((): { [name: string]: FunctionLookUpTable | undefined } => 
    freeze({
      '+': fromFunctionType(addition()),
      '*': fromFunctionType(subtraction()),
      '-': fromFunctionType(multiplication())
    }));

  const inst: ObjectType = freeze({
    uid: memoize(Symbol),
    detuplify: () => undefined,
    sizeInBytes: () => WasmCompilation.kWordSizeInBytes,
    sizeInStackItems: () => 1,
    name: () => 'Integer',
    lookUp(name: string): FunctionLookUpTable | undefined
      { return lookUpTable()[name]; },
    visit: <T>(visitor: MelodyComponentVisitor<T>): T =>
      visitor.visitObjectType(inst),
  });

  return inst;
}

export const IntegerType = freeze({ instance: memoize(make), objectTypeGetter });
