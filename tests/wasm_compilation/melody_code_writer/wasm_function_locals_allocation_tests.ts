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

import { FunctionType } from '../../../src/function_type_build';
import { FunctionTypeBase } from '../../../src/function_type_build/function_type_base';
import { IntegerType } from '../../../src/function_type_build/integer_type';
import { Helpers } from '../../../src/helpers';
import { WasmFunctionLocalAllocation } from '../../../src/wasm_compilation/melody_code_writer/wasm_function_locals_allocation';
import { TestHelpers } from '../../test_helpers';

const { describeNamed } = TestHelpers;

const { memoize, freeze } = Helpers;

describeNamed({ WasmFunctionLocalAllocation }, () => {
  const makeInst = (ftype: FunctionType) =>
    memoize(() => WasmFunctionLocalAllocation.make(ftype));

  function firstLocalOf(inst: () => WasmFunctionLocalAllocation) {
    return inst().swapB();
  }

  function receiverReserved(inst: () => WasmFunctionLocalAllocation) {
    it('receiver reserved at index 0', () => {
      expect(inst().receiverParameterIndex()).toEqual(0);
    });
  }

  describe('reserves an index for receiver', () => {
    const inst = makeInst(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: IntegerType.instance
    }));

    receiverReserved(inst);

    it('parameters map to undefined', () => {
      expect(inst().mapToParameterLocal(0)).toBeUndefined();
    });

    it('next used local starts at 1', () => {
      expect(firstLocalOf(inst)).toEqual(1);
    });

    it('locals advance expectedly', () => {
      firstLocalOf(inst);
      expect(inst().swapA()).toEqual(2);
      expect(inst().localStackPointerIndex()).toEqual(3);
      expect(inst().totalLocalCount()).toEqual(4);
    });
  });

  describe('reserves an index for parameter', () => {
    const inst = makeInst(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      parameters: IntegerType.instance
    }));

    it('has no receiver reserved', () => {
      expect(inst().receiverParameterIndex()).toBeUndefined();
    });

    it('maps parameter correctly', () => {
      expect(inst().mapToParameterLocal(0)).toEqual(0);
    });

    it('next used local starts at 1', () => {
      expect(firstLocalOf(inst)).toEqual(1);
    });
  });

  describe('reserves indices for receiver + parameters', () => {
    const inst = makeInst(freeze({
      ...FunctionTypeBase.makeNewEmitlessEmpty(),
      receiver: IntegerType.instance,
      parameters: IntegerType.instance
    }));

    receiverReserved(inst);

    it('maps parameter correctly', () => {
      expect(inst().mapToParameterLocal(0)).toEqual(1);
    });

    it('next used local starts at 2', () => {
      expect(firstLocalOf(inst)).toEqual(2);
    });

    it('locals advance expectedly', () => {
      firstLocalOf(inst);
      expect(inst().swapA()).toEqual(3);
      expect(inst().localStackPointerIndex()).toEqual(4);
      expect(inst().totalLocalCount()).toEqual(5);
    });
  });
});
